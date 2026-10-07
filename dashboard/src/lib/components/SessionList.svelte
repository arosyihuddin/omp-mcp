<script lang="ts">
  import type { Session } from '../types';
  export let sessions: Session[] = [];
  export let emptyText = 'No OMP sessions.';
  export let limit: number | undefined = undefined;
</script>

{#if sessions.length}
  <div class="divide-y divide-[#1f150c]/[.10] dark:divide-[#e1dcc9]/[.05]">
    {#each (limit ? sessions.slice(0, limit) : sessions) as session}
      <div class="grid grid-cols-[1.1fr_.7fr_1.8fr_1fr] items-center gap-4 px-5 py-3 text-[11px] transition hover:bg-[#412d15]/[.08] dark:hover:bg-[#412d15]/[.24] max-[1050px]:grid-cols-[1fr_.7fr_1.5fr]">
        <span class="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] text-[#1f150c]/[.78] dark:text-[#e1dcc9]/[.58]">{session.sessionId}</span>
        <span class="w-fit rounded-md bg-[#412d15]/[.10] px-2 py-1 text-[9px] uppercase tracking-wider text-[#412d15] dark:bg-[#e1dcc9]/[.07] dark:text-[#e1dcc9]/[.58]">{session.status}</span>
        <span class="truncate text-[#412d15]/[.62] dark:text-[#e1dcc9]/[.36]">{session.task ?? 'No task metadata'}</span>
        <span class="text-right text-[#412d15]/[.62] dark:text-[#e1dcc9]/[.36] max-[1050px]:hidden">{session.model ?? '—'}</span>
      </div>
    {/each}
  </div>
{:else}
  <div class="relative z-[1] px-5 py-10 text-center text-[11px] text-[#412d15]/[.60] dark:text-[#e1dcc9]/[.36]">{emptyText}</div>
{/if}
