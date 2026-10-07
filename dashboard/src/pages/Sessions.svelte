<script lang="ts">
  import PagePanel from '../lib/components/PagePanel.svelte';
  import SessionList from '../lib/components/SessionList.svelte';
  import type { Session } from '../lib/types';
  export let sessions: Session[] = [];
  export let loading = true;
</script>
<PagePanel title="OMP sessions" description="Lifecycle management for the isolated OMP agent runtime.">
  {#if loading}
    <div class="space-y-0" aria-label="Loading sessions" aria-busy="true">
      {#each Array(5) as _}
        <div class="flex items-center gap-3 border-b border-[#1f150c]/[.08] px-5 py-4 last:border-b-0 dark:border-[#e1dcc9]/[.05]">
          <div class="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-[#1f150c]/[.07] dark:bg-white/[.06]"></div>
          <div class="min-w-0 flex-1 space-y-2"><div class="h-3 w-40 animate-pulse rounded bg-[#1f150c]/[.07] dark:bg-white/[.06]"></div><div class="h-2.5 w-64 animate-pulse rounded bg-[#1f150c]/[.05] dark:bg-white/[.04]"></div></div>
          <div class="h-3 w-16 animate-pulse rounded bg-[#1f150c]/[.05] dark:bg-white/[.04]"></div>
        </div>
      {/each}
    </div>
  {:else}
    <SessionList {sessions} />
  {/if}
</PagePanel>
