export type RiskLevel = 'low' | 'medium' | 'high' | 'isolated';

export interface Tool {
  name: string;
  group: string;
  risk: RiskLevel;
  description: string;
  exposed: boolean;
}

export interface Session {
  sessionId: string;
  status: string;
  model?: string;
  task?: string;
  cwd?: string;
  createdAt?: string;
  updatedAt?: string;
  collab?: { webUrl?: string; viewUrl?: string; instanceId?: string };
  result?: string;
  error?: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';
export type ApprovalDecision = 'approve' | 'approve-session' | 'deny';

export interface Approval {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  risk: 'medium' | 'high';
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
  requestId: string | number;
  reason?: string;
}

export interface ToolCallLog {
  id: string;
  timestamp: string;
  requestId: string | null;
  sessionId: string | null;
  toolName: string;
  status: string;
  approval: string | null;
  durationMs: number | null;
  arguments: string | null;
  result: string | null;
  error: string | null;
}

export interface TerminalInfo {
  id: string;
  title: string;
  cwd: string;
  status: 'running' | 'exited';
  createdAt: string;
  updatedAt: string;
  exitCode?: number;
}

export interface WorkspaceItem {
  name: string;
  type: 'directory' | 'file';
  size: number | null;
  modified: string;
}

export interface GpuDevice {
  name?: string;
  utilization_gpu_percent?: number;
  temperature_c?: number;
  memory_used_mib?: number;
  memory_total_mib?: number;
  power_draw_w?: number;
}

export interface SystemTelemetry {
  os?: { hostname?: string; pretty_name?: string; platform?: string; architecture?: string; kernel?: string };
  desktop?: { environment?: string; display_server?: string };
  cpu?: { logical_cores?: number; load_average?: Record<'1m' | '5m' | '15m', number> };
  memory?: { used_bytes?: number; total_bytes?: number; usage_percent?: number };
  disk?: { path?: string; used_bytes?: number; total_bytes?: number; usage_percent?: number };
  gpu?: { devices?: GpuDevice[] };
  runtime?: Record<string, string | null>;
  network?: {
    interfaces?: { name: string; up: boolean; address_count: number; families?: string[] }[];
  };
}

export interface ServiceTelemetry {
  transport?: string;
  httpPort?: number | string;
}

export interface HostTelemetry {
  system?: SystemTelemetry;
  service?: ServiceTelemetry;
}

export interface DashboardSnapshot {
  host?: HostTelemetry;
  toolCount?: number;
  toolRiskCounts?: Partial<Record<RiskLevel, number>>;
  sessions?: Session[];
  approvalCount?: number;
}
