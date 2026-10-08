<script lang="ts">
  import { onMount } from 'svelte';
  import { RefreshCw } from '@lucide/svelte';
  import PagePanel from '../lib/components/PagePanel.svelte';
  type ToolCallLog = { id: string; timestamp: string; requestId: string | null; sessionId: string | null; toolName: string; status: string; approval: string | null; durationMs: number | null; arguments: string | null; result: string | null; error: string | null; };
  let logs: ToolCallLog[] = []; let loading = true; let error = ''; let search = ''; let status = 'all'; let expanded = '';
  async function loadLogs() {
    loading = true; error = '';
    try { const response = await fetch('/api/logs?limit=200', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Unable to load logs'); logs = data.logs ?? []; }
    catch (err) { error = err instanceof Error ? err.message : 'Unable to load logs'; }
    finally { loading = false; }
  }
  function formatTime(timestamp: string) { return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function formatPayload(value: string | null) { if (!value) return ''; try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
  $: filteredLogs = logs.filter((log) => (status === 'all' || log.status === status) && (!search || (log.toolName + ' ' + (log.sessionId ?? '') + ' ' + (log.requestId ?? '')).toLowerCase().includes(search.toLowerCase())));
  onMount(() => { loadLogs(); const events = new EventSource('/api/events'); events.addEventListener('tool_call.created', loadLogs); return () => events.close(); });
</script>

<PagePanel title="Tool call logs" description="Persistent MCP tool-call history stored in SQLite.">
  <div class="flex items-center gap-2 border-b border-[#1f150c]/[.10] p-4 dark:border-[#e1dcc9]/[.06] max-[700px]:flex-col">
    <input bind:value={search} placeholder="Search tool calls…" class="flex-1 rounded-lg border border-[#1f150c]/[.15] bg-white/40 px-3 py-2 text-[11px] outline-none dark:border-[#e1dcc9]/[.10] dark:bg-black dark:text-[#e1dcc9] max-[700px]:w-full" />
    <div class="flex gap-1">{#each ['all', 'success', 'error'] as level}<button type="button" class="rounded-md border px-2.5 py-1.5 text-[10px] capitalize transition {status === level ? 'border-[#1f150c]/[.15] bg-[#412d15]/[.12] dark:border-[#e1dcc9]/[.12] dark:bg-[#e1dcc9]/[.10]' : 'border-transparent hover:bg-[#412d15]/[.10] dark:hover:bg-[#e1dcc9]/[.08]'}" on:click={() => status = level}>{level}</button>{/each}</div>
    <button type="button" on:click={loadLogs} disabled={loading} class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#1f150c]/[.12] transition hover:bg-[#412d15]/[.10] disabled:opacity-40 dark:border-[#e1dcc9]/[.10]" aria-label="Refresh logs" title="Refresh logs"><RefreshCw size={14} class={loading ? 'animate-spin' : ''} /></button>
  </div>
  {#if error}<div class="px-5 py-4 text-[11px] text-red-700 dark:text-red-400">{error}</div>
  {:else if loading && logs.length === 0}<div class="p-8 text-center text-[11px] opacity-50">Loading logs…</div>
  {:else if filteredLogs.length === 0}<div class="px-5 py-12 text-center text-[11px] opacity-50">No tool calls found.</div>
  {:else}<div class="divide-y divide-[#1f150c]/[.10] dark:divide-[#e1dcc9]/[.05]">
    {#each filteredLogs as log}
      <button type="button" class="block w-full text-left transition hover:bg-[#412d15]/[.06] dark:hover:bg-[#412d15]/[.18]" on:click={() => expanded = expanded === log.id ? '' : log.id}>
        <div class="grid grid-cols-[90px_1fr_70px_70px] items-center gap-3 px-5 py-3.5 max-[700px]:grid-cols-[70px_1fr_60px]">
          <span class="font-mono text-[10px] opacity-60">{formatTime(log.timestamp)}</span><span class="min-w-0 truncate font-mono text-[11px]">{log.toolName}</span><span class="text-right font-mono text-[10px] opacity-55">{log.durationMs ?? '-'}ms</span><span class="text-right text-[9px] font-semibold uppercase tracking-wider {log.status === 'success' ? 'opacity-60' : 'text-red-600 dark:text-red-400'}">{log.status}</span>
        </div>
        {#if expanded === log.id}<div class="grid gap-3 border-t border-[#1f150c]/[.07] bg-[#412d15]/[.03] px-5 py-4 dark:border-[#e1dcc9]/[.05] dark:bg-white/[.02]">
          <div><div class="mb-1 text-[9px] font-semibold uppercase tracking-wider opacity-50">Request ID</div><div class="font-mono text-[10px] opacity-70">{log.requestId ?? '-'}</div></div>
          {#if log.sessionId}<div><div class="mb-1 text-[9px] font-semibold uppercase tracking-wider opacity-50">Session ID</div><div class="break-all font-mono text-[10px] opacity-70">{log.sessionId}</div></div>{/if}
          <div><div class="mb-1 text-[9px] font-semibold uppercase tracking-wider opacity-50">Arguments</div><pre class="max-h-64 overflow-auto rounded-lg border border-[#1f150c]/[.08] bg-black/[.03] p-3 text-[10px] leading-relaxed dark:border-[#e1dcc9]/[.06] dark:bg-black">{formatPayload(log.arguments)}</pre></div>
          {#if log.result}<div><div class="mb-1 text-[9px] font-semibold uppercase tracking-wider opacity-50">Result</div><pre class="max-h-64 overflow-auto rounded-lg border border-[#1f150c]/[.08] bg-black/[.03] p-3 text-[10px] leading-relaxed dark:border-[#e1dcc9]/[.06] dark:bg-black">{formatPayload(log.result)}</pre></div>{/if}
          {#if log.error}<div><div class="mb-1 text-[9px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Error</div><pre class="max-h-48 overflow-auto rounded-lg border border-red-900/[.10] p-3 text-[10px] text-red-700 dark:text-red-300">{log.error}</pre></div>{/if}
        </div>{/if}
      </button>
    {/each}
  </div>{/if}
</PagePanel>

