<script lang="ts">
  import { ChevronDown, ExternalLink, Square, X } from '@lucide/svelte';
  import type { Session } from '../types';
  export let sessions: Session[] = [];
  export let emptyText = 'No OMP sessions.';
  export let limit: number | undefined = undefined;
  let expandedId = '';
  let actionBusy = '';
  let actionError = '';

  function formatDate(value?: string) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  async function action(session: Session, type: 'interrupt' | 'dispose') {
    actionBusy = `${type}:${session.sessionId}`;
    actionError = '';
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(session.sessionId)}/${type}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Unable to ${type} session`);
      if (type === 'dispose') expandedId = expandedId === session.sessionId ? '' : expandedId;
    } catch (error) {
      actionError = error instanceof Error ? error.message : `Unable to ${type} session`;
    } finally {
      actionBusy = '';
    }
  }

  function toggle(id: string) {
    expandedId = expandedId === id ? '' : id;
    actionError = '';
  }
</script>

{#if sessions.length}
  <div class="divide-y divide-[#1f150c]/[.10] dark:divide-[#e1dcc9]/[.05]">
    {#each (limit ? sessions.slice(0, limit) : sessions) as session}
      <div class="transition hover:bg-[#412d15]/[.06] dark:hover:bg-[#412d15]/[.16]">
        <button class="grid w-full grid-cols-[auto_1.1fr_.7fr_1.8fr_1fr_auto] items-center gap-3 px-5 py-3 text-left text-[11px] max-[1050px]:grid-cols-[auto_1fr_.7fr_auto]" type="button" on:click={() => toggle(session.sessionId)} aria-expanded={expandedId === session.sessionId}>
          <ChevronDown size={14} strokeWidth={1.8} class="transition-transform {expandedId === session.sessionId ? 'rotate-180' : ''}" />
          <span class="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] text-[#1f150c]/[.78] dark:text-[#e1dcc9]/[.58]">{session.sessionId}</span>
          <span class="w-fit rounded-md bg-[#412d15]/[.10] px-2 py-1 text-[9px] uppercase tracking-wider text-[#412d15] dark:bg-[#e1dcc9]/[.07] dark:text-[#e1dcc9]/[.58]">{session.status}</span>
          <span class="truncate text-[#412d15]/[.62] dark:text-[#e1dcc9]/[.36] max-[1050px]:hidden">{session.task ?? 'No task metadata'}</span>
          <span class="text-right text-[#412d15]/[.62] dark:text-[#e1dcc9]/[.36] max-[1050px]:hidden">{session.model ?? '—'}</span>
          <span class="text-[9px] text-[#412d15]/[.42] dark:text-[#e1dcc9]/[.30]">{formatDate(session.updatedAt)}</span>
        </button>

        {#if expandedId === session.sessionId}
          <div class="border-t border-[#1f150c]/[.07] bg-[#412d15]/[.03] px-5 py-4 dark:border-[#e1dcc9]/[.04] dark:bg-white/[.02]">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2 text-[11px]">
                <div><span class="text-[#412d15]/[.42] dark:text-[#e1dcc9]/[.30]">Working directory</span><div class="mt-1 break-all font-mono text-[#412d15]/[.72] dark:text-[#e1dcc9]/[.55]">{session.cwd ?? '—'}</div></div>
                <div><span class="text-[#412d15]/[.42] dark:text-[#e1dcc9]/[.30]">Created</span><div class="mt-1 text-[#412d15]/[.72] dark:text-[#e1dcc9]/[.55]">{formatDate(session.createdAt)}</div></div>
              </div>
              <div class="space-y-2 text-[11px]">
                <div><span class="text-[#412d15]/[.42] dark:text-[#e1dcc9]/[.30]">Updated</span><div class="mt-1 text-[#412d15]/[.72] dark:text-[#e1dcc9]/[.55]">{formatDate(session.updatedAt)}</div></div>
                {#if session.collab?.instanceId}<div><span class="text-[#412d15]/[.42] dark:text-[#e1dcc9]/[.30]">Collab instance</span><div class="mt-1 font-mono text-[#412d15]/[.72] dark:text-[#e1dcc9]/[.55]">{session.collab.instanceId}</div></div>{/if}
              </div>
            </div>

            {#if session.result || session.error}
              <div class="mt-4 border-t border-[#1f150c]/[.07] pt-4 dark:border-[#e1dcc9]/[.04]">
                <div class="mb-1 text-[9px] font-semibold uppercase tracking-[.14em] text-[#412d15]/[.42] dark:text-[#e1dcc9]/[.30]">{session.error ? 'Error' : 'Latest result'}</div>
                <pre class="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/[.04] p-3 font-mono text-[10px] leading-relaxed text-[#412d15]/[.72] dark:bg-white/[.04] dark:text-[#e1dcc9]/[.52]">{session.error ?? session.result}</pre>
              </div>
            {/if}

            {#if session.collab?.webUrl || session.collab?.viewUrl}
              <div class="mt-4 flex flex-wrap gap-2 border-t border-[#1f150c]/[.07] pt-4 dark:border-[#e1dcc9]/[.04]">
                {#if session.collab.webUrl}<a href={session.collab.webUrl} target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 rounded-md border border-[#1f150c]/[.12] px-2.5 py-1.5 text-[10px] text-[#412d15]/[.72] hover:bg-[#412d15]/[.08] dark:border-[#e1dcc9]/[.10] dark:text-[#e1dcc9]/[.58] dark:hover:bg-white/[.06]"><ExternalLink size={12} /> Open Web</a>{/if}
                {#if session.collab.viewUrl}<a href={session.collab.viewUrl} target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 rounded-md border border-[#1f150c]/[.12] px-2.5 py-1.5 text-[10px] text-[#412d15]/[.72] hover:bg-[#412d15]/[.08] dark:border-[#e1dcc9]/[.10] dark:text-[#e1dcc9]/[.58] dark:hover:bg-white/[.06]"><ExternalLink size={12} /> View</a>{/if}
              </div>
            {/if}

            {#if actionError}<div class="mt-3 text-[10px] text-red-700 dark:text-red-300">{actionError}</div>{/if}
            <div class="mt-4 flex justify-end gap-2 border-t border-[#1f150c]/[.07] pt-4 dark:border-[#e1dcc9]/[.04]">
              {#if session.status === 'running' || session.status === 'starting'}
                <button type="button" disabled={!!actionBusy} on:click={() => action(session, 'interrupt')} class="inline-flex items-center gap-1.5 rounded-md border border-[#1f150c]/[.12] px-2.5 py-1.5 text-[10px] disabled:opacity-40 dark:border-[#e1dcc9]/[.10]"><Square size={11} /> {actionBusy === `interrupt:${session.sessionId}` ? 'Interrupting…' : 'Interrupt'}</button>
              {/if}
              <button type="button" disabled={!!actionBusy} on:click={() => action(session, 'dispose')} class="inline-flex items-center gap-1.5 rounded-md border border-red-900/[.16] px-2.5 py-1.5 text-[10px] text-red-800 disabled:opacity-40 dark:border-red-200/[.12] dark:text-red-200"><X size={11} /> {actionBusy === `dispose:${session.sessionId}` ? 'Disposing…' : 'Dispose'}</button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{:else}
  <div class="relative z-[1] px-5 py-10 text-center text-[11px] text-[#412d15]/[.60] dark:text-[#e1dcc9]/[.36]">{emptyText}</div>
{/if}
