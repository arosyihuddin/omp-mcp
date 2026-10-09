import { dashboardApi } from '$lib/api';
import { onServerEvent } from '$lib/api/events';
import type { Approval, HostTelemetry, RiskLevel, Session, SystemTelemetry, ServiceTelemetry } from '$lib/types';

const parse = <T>(event: MessageEvent): T | null => {
  try {
    return JSON.parse(event.data) as T;
  } catch {
    return null;
  }
};

/** App-wide live state: host telemetry, sessions, tool counts, pending approvals. */
class DashboardStore {
  host = $state<HostTelemetry>({});
  sessions = $state<Session[]>([]);
  toolCount = $state(0);
  toolRiskCounts = $state<Partial<Record<RiskLevel, number>>>({});
  pendingApprovals = $state(0);
  connected = $state(false);
  loading = $state(true);

  async refresh() {
    this.loading = true;
    try {
      const data = await dashboardApi.snapshot();
      this.host = data.host ?? {};
      this.toolCount = data.toolCount ?? 0;
      this.toolRiskCounts = data.toolRiskCounts ?? {};
      this.sessions = data.sessions ?? [];
      this.pendingApprovals = data.approvalCount ?? 0;
      this.connected = true;
    } catch {
      this.connected = false;
    } finally {
      this.loading = false;
    }
  }

  /** Subscribe to realtime events. Returns a cleanup function. */
  connect() {
    const off = [
      onServerEvent('telemetry.updated', (e) => {
        const data = parse<{ system?: SystemTelemetry; service?: ServiceTelemetry }>(e);
        if (!data) return;
        this.host = { system: data.system ?? this.host.system, service: data.service ?? this.host.service };
        this.connected = true;
      }),
      onServerEvent('dashboard.snapshot', (e) => {
        const data = parse<{ sessions?: Session[]; approvals?: Approval[] }>(e);
        if (!data) return;
        this.sessions = data.sessions ?? this.sessions;
        this.pendingApprovals = (data.approvals ?? []).filter((a) => a.status === 'pending').length;
      }),
      onServerEvent('approval.created', () => (this.pendingApprovals += 1)),
      onServerEvent('approval.updated', (e) => {
        const data = parse<{ status?: string }>(e);
        if (data && data.status !== 'pending') this.pendingApprovals = Math.max(0, this.pendingApprovals - 1);
      }),
      onServerEvent('approval.cleared', () => (this.pendingApprovals = 0)),
      onServerEvent('session.created', (e) => this.upsertSession(parse<Session>(e))),
      onServerEvent('session.updated', (e) => this.upsertSession(parse<Session>(e))),
      onServerEvent('session.removed', (e) => {
        const data = parse<{ sessionId?: string }>(e);
        if (data?.sessionId) this.sessions = this.sessions.filter((s) => s.sessionId !== data.sessionId);
      }),
    ];
    return () => off.forEach((fn) => fn());
  }

  private upsertSession(session: Session | null) {
    if (!session) return;
    const index = this.sessions.findIndex((item) => item.sessionId === session.sessionId);
    this.sessions =
      index >= 0 ? this.sessions.map((item, i) => (i === index ? session : item)) : [session, ...this.sessions];
  }
}

export const dashboard = new DashboardStore();
