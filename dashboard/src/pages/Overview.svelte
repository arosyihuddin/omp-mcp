<script lang="ts">
  import { Panel, StatCard, StatusDot } from '$lib/components/ui';
  import { dashboard } from '$lib/stores/dashboard.svelte';
  import { router } from '$lib/stores/router.svelte';
  import OverviewSkeleton from '$features/overview/OverviewSkeleton.svelte';
  import ResourcePanel from '$features/overview/ResourcePanel.svelte';
  import RiskPanel from '$features/overview/RiskPanel.svelte';
  import RuntimePanel from '$features/overview/RuntimePanel.svelte';
  import StoragePanel from '$features/overview/StoragePanel.svelte';
  import SystemPanel from '$features/overview/SystemPanel.svelte';
  import { SessionList } from '$features/sessions';

  const system = $derived(dashboard.host.system ?? {});
  const service = $derived(dashboard.host.service ?? {});
  const running = $derived(dashboard.sessions.filter((session) => session.status === 'running').length);
</script>

{#if dashboard.loading}
  <OverviewSkeleton />
{:else}
  <div class="space-y-4">
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Registered tools" value={dashboard.toolCount} hint="Across system capabilities" />
      <StatCard label="Pending approvals" value={dashboard.pendingApprovals} hint="Awaiting user decision" />
      <StatCard label="Active agents" value={running} hint="{dashboard.sessions.length} total sessions" />
      <StatCard label="Server" hint="Live telemetry · SSE stream">
        {#snippet valueSlot()}
          <span class="flex items-center gap-2 text-xl">
            <StatusDot tone={dashboard.connected ? 'success' : 'muted'} pulse={dashboard.connected} />
            {dashboard.connected ? 'Healthy' : 'Offline'}
          </span>
        {/snippet}
      </StatCard>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <SystemPanel {system} {service} />
      <ResourcePanel {system} />
      <StoragePanel {system} />
    </div>

    <div class="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <RuntimePanel {system} />
      <RiskPanel counts={dashboard.toolRiskCounts} total={dashboard.toolCount} />
    </div>

    <Panel title="Recent OMP sessions" description="Agent sessions remain isolated from the tool approval flow.">
      {#snippet actions()}
        <a
          href="/sessions"
          class="rounded px-1.5 py-1 text-sm text-fg-subtle transition-colors hover:text-fg"
          onclick={(event) => router.link(event, 'sessions')}>View all →</a
        >
      {/snippet}
      <SessionList sessions={dashboard.sessions} limit={5} emptyText="No OMP sessions are currently registered." />
    </Panel>
  </div>
{/if}
