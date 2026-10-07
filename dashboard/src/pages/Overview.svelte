<script lang="ts">
  import PagePanel from '../lib/components/PagePanel.svelte';
  import SessionList from '../lib/components/SessionList.svelte';
  import type { HostTelemetry, Session, Tool } from '../lib/types';
  export let tools: Tool[] = [];
  export let sessions: Session[] = [];
  export let host: HostTelemetry = {};
  export let connected = false;
  export let navigate: (view: string) => void;
  export let loading = true;
  $: approvalCandidates = tools.filter((tool) => tool.risk === 'medium' || tool.risk === 'high').length;
  $: runningSessions = sessions.filter((session) => session.status === 'running').length;
  const levels = ['low','medium','high','isolated'] as const;
  $: counts = Object.fromEntries(levels.map((level) => [level, tools.filter((tool) => tool.risk === level).length]));
  function value(path: string[]) {
    let current: any = host;
    for (const key of path) current = current?.[key];
    return String(current ?? '—');
  }

  function memoryValue(bytes: unknown) {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '—';
    return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
  }

  $: memoryTotal = (() => {
    const system = host.system as Record<string, any> | undefined;
    return memoryValue(system?.memory?.total_bytes);
  })();
</script>

{#if loading}
  <div class="grid grid-cols-4 gap-3 max-[1050px]:grid-cols-2" aria-label="Loading overview" aria-busy="true">
    {#each Array(4) as _}
      <div class="h-[118px] animate-pulse rounded-xl border border-[#1f150c]/[.10] bg-[#412d15]/[.05] dark:border-[#e1dcc9]/[.08] dark:bg-white/[.03]"></div>
    {/each}
  </div>
  <div class="mt-6 grid grid-cols-[1.5fr_1fr] gap-4 max-[900px]:grid-cols-1">
    <div class="h-[250px] animate-pulse rounded-xl border border-[#1f150c]/[.10] bg-[#412d15]/[.05] dark:border-[#e1dcc9]/[.08] dark:bg-white/[.03]"></div>
    <div class="h-[250px] animate-pulse rounded-xl border border-[#1f150c]/[.10] bg-[#412d15]/[.05] dark:border-[#e1dcc9]/[.08] dark:bg-white/[.03]"></div>
  </div>
  <div class="mt-4 h-[180px] animate-pulse rounded-xl border border-[#1f150c]/[.10] bg-[#412d15]/[.05] dark:border-[#e1dcc9]/[.08] dark:bg-white/[.03]"></div>
{:else}
<div class="grid grid-cols-4 gap-3 max-[1050px]:grid-cols-2">
  {#each [
    ['Registered tools', tools.length, 'Across system capabilities'],
    ['Approval candidates', approvalCandidates, 'Medium + high risk'],
    ['Active agents', runningSessions, sessions.length + ' total sessions']
  ] as metric}
    <div class="relative overflow-hidden rounded-xl border border-[#1f150c]/[.15] bg-[#e1dcc9] p-5 shadow-[0_1px_2px_rgba(31,21,12,.08)] dark:border-[#e1dcc9]/[.10] dark:bg-[#1f150c] dark:shadow-[0_1px_2px_rgba(0,0,0,.28)]">
      <div class="text-[10px] font-semibold uppercase tracking-[.15em] text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">{metric[0]}</div>
      <div class="mt-2 text-[28px] font-semibold tracking-tight text-[#1f150c] dark:text-[#e1dcc9]">{metric[1]}</div>
      <div class="mt-1 text-[10px] text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">{metric[2]}</div>
    </div>
  {/each}
  <div class="relative overflow-hidden rounded-xl border border-[#1f150c]/[.15] bg-[#e1dcc9] p-5 shadow-[0_1px_2px_rgba(31,21,12,.08)] dark:border-[#e1dcc9]/[.10] dark:bg-[#1f150c] dark:shadow-[0_1px_2px_rgba(0,0,0,.28)]">
    <div class="text-[10px] font-semibold uppercase tracking-[.15em] text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">Server</div>
    <div class="mt-2 flex items-center gap-2 text-[18px] font-semibold text-[#1f150c] dark:text-[#e1dcc9]">
      <span class="h-2 w-2 rounded-full {connected ? 'bg-[#412d15] shadow-[0_0_10px_rgba(65,45,21,.2)] dark:bg-[#e1dcc9] dark:shadow-[0_0_10px_rgba(225,220,201,.28)]' : 'bg-[#412d15]/[.40] dark:bg-[#e1dcc9]/[.30]'}"></span>
      {connected ? 'Healthy' : 'Offline'}
    </div>
    <div class="mt-1 text-[10px] text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">10s health refresh</div>
  </div>
</div>

<div class="mt-6 grid grid-cols-[1.5fr_1fr] gap-4 max-[900px]:grid-cols-1">
  <PagePanel title="Host snapshot" description="Current machine telemetry exposed by read-only system tools." tag="READ ONLY">
    <div class="grid grid-cols-3 gap-3 p-5 max-[700px]:grid-cols-1">
      {#each [
        ['Operating system', value(['system','os','pretty_name']) !== '—' ? value(['system','os','pretty_name']) : value(['system','os','platform'])],
        ['CPU', value(['system','cpu','model'])],
        ['Memory', memoryTotal],
        ['GPU', value(['system','gpu','devices','0','name'])],
        ['Runtime', 'Bun'],
        ['Transport', 'Streamable HTTP']
      ] as item}
        <div class="relative z-[1] rounded-lg border border-[#1f150c]/[.12] bg-[#412d15]/[.08] p-3 shadow-[inset_0_1px_rgba(31,21,12,.03)] dark:border-[#e1dcc9]/[.08] dark:bg-[#412d15]/[.32]">
          <span class="block text-[9px] uppercase tracking-wider text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">{item[0]}</span>
          <strong class="mt-1 block truncate text-[11px] font-medium text-[#1f150c]/[.78] dark:text-[#e1dcc9]/[.58]">{item[1]}</strong>
        </div>
      {/each}
    </div>
  </PagePanel>
  <PagePanel title="Risk distribution" description="Based on current tool annotations.">
    <div class="space-y-4 p-5">
      {#each levels as level}
        <div>
          <div class="mb-1.5 flex justify-between text-[11px]"><span class="capitalize text-[#412d15]/[.70] dark:text-[#e1dcc9]/[.58]">{level}</span><span class="text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">{counts[level]}</span></div>
<div class="h-1.5 overflow-hidden rounded-full bg-[#1f150c]/[.10] dark:bg-[#e1dcc9]/[.08]"><div class="h-full rounded-full bg-[#412d15] dark:bg-[#e1dcc9]" style="width: {tools.length ? Math.max(5, counts[level] / tools.length * 100) : 5}%"></div></div>
        </div>
      {/each}
    </div>
  </PagePanel>
</div>

<div class="mt-4">
  <PagePanel title="Recent OMP sessions" description="Agent sessions remain isolated from the tool approval flow.">
    <svelte:fragment slot="actions"><button class="text-[10px] text-[#412d15]/[.70] transition hover:text-[#1f150c] dark:text-[#e1dcc9]/[.58] dark:hover:text-[#e1dcc9]" on:click={() => navigate('sessions')}>View all →</button></svelte:fragment>
    <SessionList {sessions} limit={5} emptyText="No OMP sessions are currently registered." />
  </PagePanel>
</div>
{/if}
