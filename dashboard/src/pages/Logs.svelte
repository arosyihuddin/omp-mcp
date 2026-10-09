<script lang="ts">
  import { onMount } from 'svelte';
  import { RefreshCw, ScrollText } from '@lucide/svelte';
  import { errorMessage, logsApi } from '$lib/api';
  import { onServerEvent } from '$lib/api/events';
  import { EmptyState, IconButton, Panel, SearchInput, SegmentedControl, Skeleton } from '$lib/components/ui';
  import type { ToolCallLog } from '$lib/types';
  import { LogRow } from '$features/logs';

  type StatusFilter = 'all' | 'success' | 'error';
  const statusOptions = (['all', 'success', 'error'] as const).map((value) => ({ value, label: value }));

  let logs = $state<ToolCallLog[]>([]);
  let loading = $state(true);
  let error = $state('');
  let search = $state('');
  let status = $state<StatusFilter>('all');
  let expandedId = $state('');

  const filtered = $derived.by(() => {
    const query = search.trim().toLowerCase();
    return logs.filter(
      (log) =>
        (status === 'all' || log.status === status) &&
        (!query || `${log.toolName} ${log.sessionId ?? ''} ${log.requestId ?? ''}`.toLowerCase().includes(query)),
    );
  });

  async function load() {
    loading = true;
    error = '';
    try {
      logs = await logsApi.list();
    } catch (err) {
      error = errorMessage(err, 'Unable to load logs');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void load();
    return onServerEvent('tool_call.created', () => void load());
  });
</script>

<Panel title="Tool call logs" description="Persistent MCP tool-call history stored in SQLite.">
  <div class="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
    <SearchInput class="flex-1" bind:value={search} placeholder="Search tool calls…" label="Search tool calls" />
    <div class="flex items-center gap-2">
      <SegmentedControl label="Filter by status" options={statusOptions} bind:value={status} />
      <IconButton label="Refresh logs" variant="outline" disabled={loading} onclick={load}>
        <RefreshCw size={14} class={loading ? 'animate-spin' : ''} />
      </IconButton>
    </div>
  </div>

  {#if error}
    <p class="px-4 py-4 text-sm text-danger" role="alert">{error}</p>
  {:else if loading && logs.length === 0}
    <div class="divide-y divide-line" aria-busy="true" aria-label="Loading logs">
      {#each Array(8) as _, index (index)}
        <div class="flex items-center gap-3 px-4 py-3.5"><Skeleton class="h-3 w-16" /><Skeleton class="h-3 w-48" /><Skeleton class="ml-auto h-4 w-14" /></div>
      {/each}
    </div>
  {:else if filtered.length === 0}
    <EmptyState icon={ScrollText} title="No tool calls found" description="Tool calls made through the MCP server will appear here." />
  {:else}
    <div class="divide-y divide-line">
      {#each filtered as log (log.id)}
        <LogRow {log} expanded={expandedId === log.id} ontoggle={() => (expandedId = expandedId === log.id ? '' : log.id)} />
      {/each}
    </div>
  {/if}
</Panel>
