<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, CircleCheck, FileClock, Trash2 } from '@lucide/svelte';
  import { EmptyState, IconButton, Panel } from '$lib/components/ui';
  import { ApprovalCard, ApprovalHistory, ApprovalSkeleton, approvals } from '$features/approvals';

  let showHistory = $state(false);

  async function clearHistory() {
    if (await approvals.clearHistory()) showHistory = false;
  }

  onMount(() => {
    void approvals.load();
    return approvals.watch();
  });
</script>

<Panel
  title="Approvals"
  description="Review medium and high-risk operations before they execute."
  tag={approvals.pending.length ? `${approvals.pending.length} PENDING` : 'CLEAR'}
  tagTone={approvals.pending.length ? 'warning' : 'neutral'}
>
  {#snippet leading()}
    {#if showHistory}
      <IconButton label="Back to pending approvals" size="sm" onclick={() => (showHistory = false)}>
        <ArrowLeft size={14} strokeWidth={1.8} />
      </IconButton>
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if !showHistory}
      <IconButton label="Approval history" size="sm" onclick={() => (showHistory = true)}><FileClock size={14} strokeWidth={1.8} /></IconButton>
    {/if}
    {#if approvals.history.length > 0}
      <IconButton label="Clear approval history" size="sm" disabled={approvals.clearing} onclick={clearHistory} class="hover:text-danger">
        <Trash2 size={14} strokeWidth={1.8} />
      </IconButton>
    {/if}
  {/snippet}

  {#if approvals.error}
    <p class="m-4 rounded-md border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{approvals.error}</p>
  {/if}

  {#if approvals.loading}
    <ApprovalSkeleton />
  {:else if showHistory}
    <div class="p-4"><ApprovalHistory items={approvals.history} /></div>
  {:else if approvals.pending.length === 0}
    <EmptyState icon={CircleCheck} title="No pending approvals" description="Operations that require confirmation will appear here before execution." />
  {:else}
    <div class="space-y-3 p-4">
      {#each approvals.pending as approval (approval.id)}
        <ApprovalCard {approval} busy={approvals.actingId === approval.id} ondecide={(decision) => approvals.decide(approval.id, decision)} />
      {/each}
    </div>
  {/if}
</Panel>
