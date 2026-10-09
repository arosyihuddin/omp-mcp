<script lang="ts">
  import { Activity } from '@lucide/svelte';
  import { EmptyState } from '$lib/components/ui';
  import type { Session } from '$lib/types';
  import SessionRow from './SessionRow.svelte';

  interface Props {
    sessions: Session[];
    limit?: number;
    emptyText?: string;
  }

  let { sessions, limit, emptyText = 'No OMP sessions.' }: Props = $props();

  const visible = $derived(limit ? sessions.slice(0, limit) : sessions);
</script>

{#if visible.length}
  <div class="divide-y divide-line">
    {#each visible as session (session.sessionId)}
      <SessionRow {session} />
    {/each}
  </div>
{:else}
  <EmptyState icon={Activity} title={emptyText} />
{/if}
