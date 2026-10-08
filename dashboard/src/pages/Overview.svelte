<script lang="ts">
  import PagePanel from '../lib/components/PagePanel.svelte';
  import SessionList from '../lib/components/SessionList.svelte';
  import type { HostTelemetry, Session } from '../lib/types';
  export let toolCount = 0;
  export let toolRiskCounts: Record<string, number> = {};
  export let sessions: Session[] = [];
  export let host: HostTelemetry = {};
  export let connected = false;
  export let navigate: (view: string) => void;
  export let loading = true;
  export let approvalCount = 0;
  $: runningSessions = sessions.filter((session) => session.status === 'running').length;
  const levels = ['low','medium','high','isolated'] as const;
  $: counts = toolRiskCounts;
  function value(source: any, path: string[]) {
    let current: any = source;
    for (const key of path) current = current?.[key];
    return String(current ?? '—');
  }
  function number(source: any, path: string[]) {
    let current: any = source;
    for (const key of path) current = current?.[key];
    return typeof current === 'number' && Number.isFinite(current) ? current : null;
  }
  function memoryValue(bytes: unknown) {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '—';
    return String((bytes / 1024 ** 3).toFixed(1)) + ' GiB';
  }
  $: system = (host.system as any) ?? {};
  $: memoryUsed = memoryValue(number(system, ['memory','used_bytes']));
  $: memoryTotal = memoryValue(number(system, ['memory','total_bytes']));
  $: memoryPercent = number(system, ['memory','usage_percent']);
  $: diskUsed = memoryValue(number(system, ['disk','used_bytes']));
  $: diskTotal = memoryValue(number(system, ['disk','total_bytes']));
  $: diskPercent = number(system, ['disk','usage_percent']);
  $: gpu = system?.gpu?.devices?.[0] ?? null;
  $: gpuCount = Array.isArray(system?.gpu?.devices) ? system.gpu.devices.length : 0;
  $: load = system?.cpu?.load_average;
  $: hostService = (host.service as any) ?? {};
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
    ['Registered tools', toolCount, 'Across system capabilities'],
    ['Pending approvals', approvalCount, 'Awaiting user decision'],
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
    <div class="mt-1 text-[10px] text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">Live telemetry · SSE stream</div>
  </div>
</div>

<div class="mt-6 grid grid-cols-3 gap-4 max-[1050px]:grid-cols-2 max-[700px]:grid-cols-1">
  <PagePanel title="System" description="Operating system and service environment." tag="LIVE">
    <div class="space-y-3 p-5">
      <div class="rounded-lg border border-[#1f150c]/[.12] bg-[#412d15]/[.08] p-3 dark:border-[#e1dcc9]/[.08] dark:bg-[#412d15]/[.32]">
        <span class="block text-[9px] uppercase tracking-wider text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">Host</span>
        <strong class="mt-1 block truncate text-[12px] font-medium">{value(system, ['os','hostname'])}</strong>
        <span class="mt-1 block text-[10px] text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">{value(system, ['os','pretty_name']) !== '—' ? value(system, ['os','pretty_name']) : value(system, ['os','platform'])} · {value(system, ['os','architecture'])}</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-[10px]">
        <div><span class="block text-[#412d15]/[.45] dark:text-[#e1dcc9]/[.34]">Kernel</span><strong class="block truncate">{value(system, ['os','kernel'])}</strong></div>
        <div><span class="block text-[#412d15]/[.45] dark:text-[#e1dcc9]/[.34]">Desktop</span><strong class="block truncate">{value(system, ['desktop','environment'])}</strong></div>
        <div><span class="block text-[#412d15]/[.45] dark:text-[#e1dcc9]/[.34]">Display</span><strong class="block truncate">{value(system, ['desktop','display_server'])}</strong></div>
        <div><span class="block text-[#412d15]/[.45] dark:text-[#e1dcc9]/[.34]">Transport</span><strong class="block truncate">{value(hostService, ['transport'])}{value(hostService, ['httpPort']) !== '—' ? ':' + value(hostService, ['httpPort']) : ''}</strong></div>
      </div>
    </div>
  </PagePanel>

  <PagePanel title="CPU & Memory" description="Current host resource state." tag="LIVE">
    <div class="space-y-4 p-5">
      <div>
        <div class="flex items-center justify-between text-[10px]"><span class="text-[#412d15]/[.55] dark:text-[#e1dcc9]/[.40]">CPU</span><strong>{value(system, ['cpu','logical_cores'])} cores</strong></div>
        <div class="mt-2 grid grid-cols-3 gap-2 text-[10px]">
          <div class="rounded-md bg-[#412d15]/[.07] p-2 dark:bg-white/[.04]">1m <strong class="block">{load?.['1m']?.toFixed?.(2) ?? '—'}</strong></div>
          <div class="rounded-md bg-[#412d15]/[.07] p-2 dark:bg-white/[.04]">5m <strong class="block">{load?.['5m']?.toFixed?.(2) ?? '—'}</strong></div>
          <div class="rounded-md bg-[#412d15]/[.07] p-2 dark:bg-white/[.04]">15m <strong class="block">{load?.['15m']?.toFixed?.(2) ?? '—'}</strong></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-[10px]"><span>Memory</span><strong>{memoryUsed} / {memoryTotal}</strong></div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1f150c]/[.10] dark:bg-[#e1dcc9]/[.08]"><div class="h-full rounded-full bg-[#412d15] dark:bg-[#e1dcc9]" style="width: {memoryPercent ?? 0}%"></div></div>
        <div class="mt-1 text-[9px] text-[#412d15]/[.45] dark:text-[#e1dcc9]/[.34]">{memoryPercent !== null ? memoryPercent + '%' : '—'} used</div>
      </div>
    </div>
  </PagePanel>

  <PagePanel title="GPU & Storage" description="Accelerator and filesystem telemetry." tag="LIVE">
    <div class="space-y-3 p-5">
      {#if gpu}
        <div class="rounded-lg border border-[#1f150c]/[.12] bg-[#412d15]/[.08] p-3 dark:border-[#e1dcc9]/[.08] dark:bg-[#412d15]/[.32]">
          <div class="flex items-center justify-between gap-2"><span class="text-[10px] text-[#412d15]/[.55] dark:text-[#e1dcc9]/[.40]">GPU {gpuCount > 1 ? '· ' + gpuCount + ' devices' : ''}</span><strong class="truncate text-[11px]">{gpu.name ?? 'Unknown GPU'}</strong></div>
          <div class="mt-2 grid grid-cols-2 gap-2 text-[10px]">
            <span>Util <strong>{gpu.utilization_gpu_percent ?? '—'}%</strong></span>
            <span>Temp <strong>{gpu.temperature_c ?? '—'}°C</strong></span>
            <span>VRAM <strong>{gpu.memory_used_mib ?? '—'} / {gpu.memory_total_mib ?? '—'} MiB</strong></span>
            <span>Power <strong>{gpu.power_draw_w ?? '—'} W</strong></span>
          </div>
        </div>
      {:else}
        <div class="rounded-lg border border-[#1f150c]/[.12] bg-[#412d15]/[.08] p-3 text-[10px] text-[#412d15]/[.55] dark:border-[#e1dcc9]/[.08] dark:bg-[#412d15]/[.32] dark:text-[#e1dcc9]/[.40]">No GPU telemetry available.</div>
      {/if}
      <div>
        <div class="flex justify-between text-[10px]"><span>Disk {value(system, ['disk','path'])}</span><strong>{diskUsed} / {diskTotal}</strong></div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1f150c]/[.10] dark:bg-[#e1dcc9]/[.08]"><div class="h-full rounded-full bg-[#412d15] dark:bg-[#e1dcc9]" style="width: {diskPercent ?? 0}%"></div></div>
        <div class="mt-1 text-[9px] text-[#412d15]/[.45] dark:text-[#e1dcc9]/[.34]">{diskPercent !== null ? diskPercent + '%' : '—'} used</div>
      </div>
    </div>
  </PagePanel>
</div>

<div class="mt-4 grid grid-cols-[1.5fr_1fr] gap-4 max-[900px]:grid-cols-1">
  <PagePanel title="Runtime & Network" description="Detected runtimes and active network interfaces." tag="LIVE">
    <div class="grid grid-cols-2 gap-4 p-5 max-[600px]:grid-cols-1">
      <div class="space-y-2">
        {#each Object.entries((host.system as any)?.runtime ?? {}) as [name, version]}
          <div class="flex items-center justify-between gap-3 text-[10px]"><span class="uppercase tracking-wider text-[#412d15]/[.48] dark:text-[#e1dcc9]/[.34]">{name}</span><strong class="truncate">{version ?? 'not installed'}</strong></div>
        {/each}
      </div>
      <div class="space-y-2">
        {#each ((host.system as any)?.network?.interfaces ?? []) as network}
          <div class="rounded-md bg-[#412d15]/[.07] p-2 dark:bg-white/[.04]">
            <div class="flex justify-between text-[10px]"><strong>{network.name}</strong><span>{network.up ? 'up' : 'down'}</span></div>
            <div class="mt-1 text-[9px] text-[#412d15]/[.48] dark:text-[#e1dcc9]/[.34]">{network.address_count} addresses · {(network.families ?? []).join(', ') || '—'}</div>
          </div>
        {/each}
      </div>
    </div>
  </PagePanel>
  <PagePanel title="Risk distribution" description="Based on current tool annotations.">
    <div class="space-y-4 p-5">
      {#each levels as level}
        <div>
          <div class="mb-1.5 flex justify-between text-[11px]"><span class="capitalize text-[#412d15]/[.70] dark:text-[#e1dcc9]/[.58]">{level}</span><span class="text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">{counts[level]}</span></div>
          <div class="h-1.5 overflow-hidden rounded-full bg-[#1f150c]/[.10] dark:bg-[#e1dcc9]/[.08]"><div class="h-full rounded-full bg-[#412d15] dark:bg-[#e1dcc9]" style="width: {toolCount ? Math.max(5, counts[level] / toolCount * 100) : 5}%"></div></div>
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
