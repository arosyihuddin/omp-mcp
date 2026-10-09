<script lang="ts">
  import { onMount } from 'svelte';
  import { Wrench } from '@lucide/svelte';
  import { EmptyState, Panel, SearchInput, SegmentedControl } from '$lib/components/ui';
  import { tools } from '$lib/stores/tools.svelte';
  import type { RiskLevel } from '$lib/types';
  import { ToolListSkeleton, ToolRow } from '$features/tools';

  type RiskFilter = 'all' | RiskLevel;
  const riskOptions = (['all', 'low', 'medium', 'high', 'isolated'] as const).map((value) => ({ value, label: value }));

  let search = $state('');
  let risk = $state<RiskFilter>('all');

  const filtered = $derived.by(() => {
    const query = search.trim().toLowerCase();
    return tools.items.filter(
      (tool) =>
        (risk === 'all' || tool.risk === risk) &&
        (!query || `${tool.name} ${tool.description} ${tool.group}`.toLowerCase().includes(query)),
    );
  });

  onMount(() => void tools.load());
</script>

<Panel title="Tool catalog" description="Risk is descriptive metadata. Approval UI can consume it without duplicating policy.">
  {#if tools.loading}
    <ToolListSkeleton />
  {:else}
    <div class="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
      <SearchInput class="flex-1" bind:value={search} placeholder="Search tools…" label="Search tools" />
      <SegmentedControl label="Filter by risk" options={riskOptions} bind:value={risk} />
    </div>
    {#if tools.error}<p class="border-b border-line px-4 py-2 text-sm text-danger" role="alert">{tools.error}</p>{/if}
    {#if filtered.length}
      <div class="divide-y divide-line">
        {#each filtered as tool (tool.name)}
          <ToolRow {tool} updating={tools.updating.has(tool.name)} ontoggle={(item) => tools.toggleExposure(item)} />
        {/each}
      </div>
    {:else}
      <EmptyState icon={Wrench} title="No tools match" description="Try a different search term or risk filter." />
    {/if}
  {/if}
</Panel>
