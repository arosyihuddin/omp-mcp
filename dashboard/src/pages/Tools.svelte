<script lang="ts">
  import { Box, SquareDashed, Workflow, Wrench } from '@lucide/svelte';
  import PagePanel from '../lib/components/PagePanel.svelte';
  import type { Tool } from '../lib/types';
  export let tools: Tool[] = [];
  export let loading = true;
  export let updateExposure: (tool: Tool, exposed: boolean) => Promise<void> = async () => {};
  let search = '';
  let risk = 'all';
  $: filteredTools = tools.filter((tool) => (!search || (tool.name + ' ' + tool.description + ' ' + tool.group).toLowerCase().includes(search.toLowerCase())) && (risk === 'all' || tool.risk === risk));
  function iconFor(group: string) { return group === 'OMP Agent' ? Workflow : group === 'Computer' ? SquareDashed : group === 'System' ? Box : Wrench; }
  let updating = new Set<string>();
  async function toggleExposure(tool: Tool) {
    if (updating.has(tool.name)) return;
    updating = new Set(updating).add(tool.name);
    try { await updateExposure(tool, !tool.exposed); } finally { const next = new Set(updating); next.delete(tool.name); updating = next; }
  }
</script>
<PagePanel title="Tool catalog" description="Risk is descriptive metadata. Approval UI can consume it without duplicating policy.">
  {#if loading}
    <div class="border-b border-[#1f150c]/[.10] p-4 dark:border-[#e1dcc9]/[.06]"><div class="h-9 w-full animate-pulse rounded-lg bg-[#1f150c]/[.06] dark:bg-white/[.05]"></div></div>
    <div class="divide-y divide-[#1f150c]/[.10] dark:divide-[#e1dcc9]/[.05]" aria-label="Loading tools" aria-busy="true">
      {#each Array(8) as _}
        <div class="grid grid-cols-[32px_1fr_120px] items-center gap-3 px-5 py-4 max-[700px]:grid-cols-[32px_1fr]">
          <div class="h-8 w-8 animate-pulse rounded-lg bg-[#1f150c]/[.07] dark:bg-white/[.06]"></div>
          <div class="min-w-0 space-y-2"><div class="h-3 w-36 animate-pulse rounded bg-[#1f150c]/[.07] dark:bg-white/[.06]"></div><div class="h-2.5 w-3/4 animate-pulse rounded bg-[#1f150c]/[.05] dark:bg-white/[.04]"></div></div>
          <div class="ml-auto h-2.5 w-16 animate-pulse rounded bg-[#1f150c]/[.05] dark:bg-white/[.04] max-[700px]:hidden"></div>
        </div>
      {/each}
    </div>
  {:else}
  <div class="flex items-center gap-2 border-b border-[#1f150c]/[.10] p-4 dark:border-[#e1dcc9]/[.06] max-[700px]:flex-col">
    <input bind:value={search} placeholder="Search tools…" class="flex-1 rounded-lg border border-[#1f150c]/[.15] bg-white/40 px-3 py-2 text-[11px] text-[#1f150c] outline-none placeholder:text-[#412d15]/[.40] focus:border-[#412d15]/[.30] focus:ring-1 focus:ring-[#412d15]/[.10] dark:border-[#e1dcc9]/[.10] dark:bg-black dark:text-[#e1dcc9] dark:placeholder:text-[#e1dcc9]/[.36] dark:focus:border-[#e1dcc9]/[.20] dark:focus:ring-[#e1dcc9]/[.5] max-[700px]:w-full" />
    <div class="flex gap-1">{#each ['all','low','medium','high','isolated'] as level}<button class="rounded-md border px-2.5 py-1.5 text-[10px] capitalize transition {risk === level ? 'border-[#1f150c]/[.15] bg-[#412d15]/[.12] text-[#1f150c] dark:border-[#e1dcc9]/[.10] dark:bg-[#412d15]/[.75] dark:text-[#e1dcc9]' : 'border-transparent text-[#412d15]/[.65] hover:bg-[#412d15]/[.10] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.58] dark:hover:bg-[#412d15]/[.30] dark:hover:text-[#e1dcc9]'}" on:click={() => risk = level}>{level}</button>{/each}</div>
  </div>
  <div class="divide-y divide-[#1f150c]/[.10] dark:divide-[#e1dcc9]/[.05]">
    {#each filteredTools as tool}{@const Icon = iconFor(tool.group)}
      <div class="relative z-[1] grid grid-cols-[32px_1fr_120px_40px] items-center gap-3 px-5 py-4 transition hover:bg-[#412d15]/[.08] dark:hover:bg-[#412d15]/[.24] max-[700px]:grid-cols-[32px_1fr]">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1f150c]/[.12] bg-[#412d15]/[.08] text-[#412d15]/[.70] dark:border-[#e1dcc9]/[.08] dark:bg-[#412d15]/[.28] dark:text-[#e1dcc9]/[.58]"><Icon size={16} strokeWidth={1.8} /></div>
        <div class="min-w-0"><div class="flex items-center gap-2"><span class="font-mono text-[12px] text-[#1f150c] dark:text-[#e1dcc9]">{tool.name}</span><span class="rounded-md bg-[#412d15]/[.10] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-[#412d15] dark:bg-[#412d15]/[.80] dark:text-[#e1dcc9]">{tool.risk}</span></div><div class="mt-1 text-[11px] text-[#412d15]/[.62] dark:text-[#e1dcc9]/[.36]">{tool.description}</div></div>
        <div class="contents">
          <div class="text-right text-[10px] uppercase tracking-wider text-[#412d15]/[.45] dark:text-[#e1dcc9]/[.36] max-[700px]:hidden">{tool.group}</div>
          <div class="flex items-center justify-end max-[700px]:col-start-2 max-[700px]:mt-2">
            <button type="button" on:click={() => toggleExposure(tool)} disabled={updating.has(tool.name)} aria-label={tool.exposed ? `Hide ${tool.name}` : `Expose ${tool.name}`} title={tool.exposed ? 'Hide from MCP clients' : 'Expose to MCP clients'} class="relative h-5 w-9 rounded-full border transition disabled:opacity-50 {tool.exposed ? 'border-[#412d15] bg-[#412d15] dark:border-[#e1dcc9] dark:bg-[#e1dcc9]' : 'border-[#1f150c]/[.18] bg-transparent dark:border-[#e1dcc9]/[.16]'}">
              <span class="absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all {tool.exposed ? 'left-[18px] bg-[#e1dcc9] dark:bg-black' : 'left-0.5 bg-[#412d15]/[.45] dark:bg-[#e1dcc9]/[.45]'}"></span>
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
  {/if}
</PagePanel>
