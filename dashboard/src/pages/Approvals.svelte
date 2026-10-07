<script lang="ts">
  import { CircleCheck, CircleX, Clock3, ShieldAlert, TimerOff, Ban, FileClock, Trash, ArrowLeft, ChevronDown } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import PagePanel from '../lib/components/PagePanel.svelte';
  import EmptyState from '../lib/components/EmptyState.svelte';

  type Approval = {
    id: string;
    tool: string;
    args: Record<string, unknown>;
    risk: 'medium' | 'high';
    status: 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';
    createdAt: string;
    updatedAt: string;
    sessionId?: string;
    requestId: string | number;
    reason?: string;
  };

  let approvals: Approval[] = [];
  let loading = true;
  let actionId = '';
  let error = '';
  let showHistory = false;
  let clearingHistory = false;
  let expandedHistoryId = '';
  async function loadApprovals() {
    try {
      const response = await fetch('/api/approvals', { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load approvals');
      const data = await response.json() as { approvals: Approval[] };
      approvals = data.approvals;
      error = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load approvals';
    } finally {
      loading = false;
    }
  }

  async function decide(id: string, action: 'approve' | 'approve-session' | 'deny') {
    actionId = id;
    error = '';
    try {
      const response = await fetch('/api/approvals/' + id + '/' + action, { method: 'POST' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || 'Unable to update approval');
      }
      await loadApprovals();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to update approval';
    } finally {
      actionId = '';
    }
  }

  function formatTime(value: string) {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function decisionLabel(approval: Approval) {
    if (approval.status === 'approved') return approval.sessionId ? 'Allowed for session' : 'Allowed once';
    if (approval.status === 'denied') return 'Denied';
    if (approval.status === 'expired') return 'Expired';
    return 'Cancelled';
  }

  function decisionIcon(approval: Approval) {
    if (approval.status === 'approved') return CircleCheck;
    if (approval.status === 'denied') return Ban;
    if (approval.status === 'expired') return TimerOff;
    return Clock3;
  }

  function toggleHistory(id: string) {
    expandedHistoryId = expandedHistoryId === id ? '' : id;
  }

  function decisionTone(approval: Approval) {
    if (approval.status === 'approved') return 'text-[#412d15] dark:text-[#e1dcc9]';
    if (approval.status === 'denied') return 'text-[#8f321c] dark:text-[#d98d72]';
    return 'text-[#1f150c]/[.42] dark:text-[#e1dcc9]/[.35]';
  }

  async function clearHistory() {
    if (!history.length || clearingHistory) return;
    clearingHistory = true;
    error = '';
    try {
      const response = await fetch('/api/approvals/clear', { method: 'POST' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || 'Unable to clear approval history');
      }
      await loadApprovals();
      showHistory = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to clear approval history';
    } finally {
      clearingHistory = false;
    }
  }

  function formatArgs(args: Record<string, unknown>) {
    return JSON.stringify(args, null, 2);
  }

  $: pending = approvals.filter((approval) => approval.status === 'pending');
  $: history = approvals.filter((approval) => approval.status !== 'pending');

  onMount(() => {
    loadApprovals();
    const events = new EventSource('/api/events');
    const onApprovalEvent = () => loadApprovals();
    events.addEventListener('approval.created', onApprovalEvent);
    events.addEventListener('approval.updated', onApprovalEvent);
    events.addEventListener('approval.cleared', onApprovalEvent);
    return () => events.close();
  });
</script>

<div class="h-full min-h-0">
<PagePanel title="Approvals" description="Review medium and high-risk operations before they execute." tag={pending.length ? pending.length + ' PENDING' : 'CLEAR'} tagTone={pending.length ? 'amber' : 'default'}>
  <div slot="title-prefix" class:invisible={!showHistory} class:opacity-0={!showHistory}>
    <button class="rounded-lg p-1.5 -ml-1.5 text-[#1f150c]/[.52] transition hover:bg-[#1f150c]/[.06] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.48] dark:hover:bg-white/[.06] dark:hover:text-[#e1dcc9]" title="Back to pending approvals" aria-label="Back to pending approvals" tabindex={showHistory ? 0 : -1} onclick={() => showHistory = false}>
      <ArrowLeft size={14} strokeWidth={1.8} />
    </button>
  </div>
  <div slot="actions" class="flex items-center gap-1">
    {#if !showHistory}
      <button class="rounded-lg p-1.5 text-[#1f150c]/[.52] transition hover:bg-[#1f150c]/[.06] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.48] dark:hover:bg-white/[.06] dark:hover:text-[#e1dcc9]" title="Approval history" aria-label="Approval history" onclick={() => showHistory = true}>
        <FileClock size={14} strokeWidth={1.8} />
      </button>
    {/if}
    {#if history.length > 0}
      <button class="rounded-lg p-1.5 text-[#1f150c]/[.52] transition hover:bg-[#1f150c]/[.06] hover:text-[#8f321c] disabled:opacity-40 dark:text-[#e1dcc9]/[.48] dark:hover:bg-white/[.06] dark:hover:text-[#d98d72]" title="Clear approval history" aria-label="Clear approval history" disabled={clearingHistory} onclick={clearHistory}>
        <Trash size={14} strokeWidth={1.8} />
      </button>
    {/if}
  </div>
  {#if error}
    <div class="mb-4 rounded-lg border border-[#8f321c]/[.20] bg-[#8f321c]/[.06] px-3 py-2 text-[11px] text-[#8f321c] dark:border-[#d98d72]/[.20] dark:bg-[#8f321c]/[.12] dark:text-[#d98d72]">{error}</div>
  {/if}

  {#if loading}
    <div class="space-y-3 p-4 sm:p-5" aria-label="Loading approvals" aria-busy="true">
      {#each Array(3) as _}
        <div class="overflow-hidden rounded-xl border border-[#1f150c]/[.10] bg-[#412d15]/[.03] dark:border-[#e1dcc9]/[.08] dark:bg-white/[.02]">
          <div class="flex items-start justify-between gap-4 border-b border-[#1f150c]/[.06] px-4 py-3 dark:border-[#e1dcc9]/[.06]">
            <div class="min-w-0 flex-1 space-y-2">
              <div class="flex items-center gap-2">
                <div class="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-[#1f150c]/[.10] dark:bg-white/[.08]"></div>
                <div class="h-3 w-28 animate-pulse rounded bg-[#1f150c]/[.10] dark:bg-white/[.08]"></div>
                <div class="h-4 w-10 animate-pulse rounded-md bg-[#1f150c]/[.08] dark:bg-white/[.06]"></div>
              </div>
              <div class="h-2.5 w-48 animate-pulse rounded bg-[#1f150c]/[.06] dark:bg-white/[.05]"></div>
            </div>
            <div class="flex shrink-0 gap-2">
              <div class="h-7 w-14 animate-pulse rounded-lg bg-[#1f150c]/[.07] dark:bg-white/[.06]"></div>
              <div class="h-7 w-20 animate-pulse rounded-lg bg-[#1f150c]/[.07] dark:bg-white/[.06]"></div>
              <div class="hidden h-7 w-28 animate-pulse rounded-lg bg-[#1f150c]/[.07] dark:bg-white/[.06] sm:block"></div>
            </div>
          </div>
          <div class="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.35fr)]">
            <div class="h-28 animate-pulse rounded-lg border border-[#1f150c]/[.06] bg-[#1f150c]/[.04] dark:border-[#e1dcc9]/[.06] dark:bg-white/[.03]"></div>
            <div class="space-y-2 py-1">
              <div class="h-2.5 w-20 animate-pulse rounded bg-[#1f150c]/[.07] dark:bg-white/[.06]"></div>
              <div class="h-2.5 w-full animate-pulse rounded bg-[#1f150c]/[.05] dark:bg-white/[.04]"></div>
              <div class="h-2.5 w-4/5 animate-pulse rounded bg-[#1f150c]/[.05] dark:bg-white/[.04]"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if showHistory}
    <div class="p-4 sm:p-5">
      {#if history.length === 0}
        <EmptyState title="No approval history" description="Completed approval decisions will appear here." icon={FileClock} />
      {:else}
        <div class="overflow-hidden rounded-lg border border-[#1f150c]/[.08] bg-[#412d15]/[.02] dark:border-[#e1dcc9]/[.08] dark:bg-white/[.015]">
          {#each history.slice(0, 12) as approval (approval.id)}
            {@const Icon = decisionIcon(approval)}
            <div class="border-b border-[#1f150c]/[.06] last:border-b-0 dark:border-[#e1dcc9]/[.06]">
              <button class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#1f150c]/[.03] dark:hover:bg-white/[.03]" aria-expanded={expandedHistoryId === approval.id} onclick={() => toggleHistory(approval.id)}>
                <Icon size={14} strokeWidth={1.8} class={"shrink-0 " + decisionTone(approval)} />
                <div class="min-w-0 flex-1">
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="truncate text-[10px] font-medium text-[#1f150c]/[.78] dark:text-[#e1dcc9]/[.72]">{approval.tool}</span>
                    <span class={"shrink-0 text-[9px] " + decisionTone(approval)}>{decisionLabel(approval)}</span>
                  </div>
                  <div class="mt-0.5 truncate text-[9px] text-[#1f150c]/[.32] dark:text-[#e1dcc9]/[.25]">Request {approval.requestId}</div>
                </div>
                <span class="shrink-0 text-[9px] tabular-nums text-[#1f150c]/[.35] dark:text-[#e1dcc9]/[.28]">{formatTime(approval.updatedAt)}</span>
                <ChevronDown size={13} strokeWidth={1.8} class={"shrink-0 transition-transform " + (expandedHistoryId === approval.id ? "rotate-180" : "")} />
              </button>
              {#if expandedHistoryId === approval.id}
                <div class="border-t border-[#1f150c]/[.06] px-3 pb-3 pt-2.5 dark:border-[#e1dcc9]/[.06]">
                  <div class="mb-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[#1f150c]/[.38] dark:text-[#e1dcc9]/[.32]">Tool parameters</div>
                  <pre class="max-h-64 overflow-auto rounded-md border border-[#1f150c]/[.07] bg-[#1f150c]/[.025] p-2.5 font-mono text-[9px] leading-relaxed text-[#1f150c]/[.68] dark:border-[#e1dcc9]/[.07] dark:bg-white/[.02] dark:text-[#e1dcc9]/[.62]">{formatArgs(approval.args)}</pre>
                </div>
              {/if}
            </div>
          {/each}

        </div>
      {/if}
    </div>
  {:else if pending.length === 0}
    <EmptyState title="No pending approvals" description="Operations that require confirmation will appear here before execution." icon={CircleCheck} />
  {:else}
    <div class="space-y-3 p-4 sm:p-5">
      {#each pending as approval (approval.id)}
        <article class="overflow-hidden rounded-xl border border-[#1f150c]/[.12] bg-[#412d15]/[.03] dark:border-[#e1dcc9]/[.10] dark:bg-white/[.02]">
          <div class="flex items-start justify-between gap-4 border-b border-[#1f150c]/[.08] px-4 py-3 dark:border-[#e1dcc9]/[.08]">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <ShieldAlert size={14} strokeWidth={1.8} class="shrink-0 text-[#412d15]/[.65] dark:text-[#e1dcc9]/[.55]" />
                <h3 class="truncate text-[12px] font-medium">{approval.tool}</h3>
                <span class="rounded-md border border-[#1f150c]/[.10] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#1f150c]/[.50] dark:border-[#e1dcc9]/[.10] dark:text-[#e1dcc9]/[.42]">{approval.risk}</span>
              </div>
              <p class="mt-1 text-[10px] text-[#1f150c]/[.42] dark:text-[#e1dcc9]/[.35]">Requested {formatTime(approval.createdAt)} · Request {approval.requestId}</p>
            </div>
            <div class="flex shrink-0 gap-2">
              <button class="rounded-lg border border-[#1f150c]/[.12] px-3 py-1.5 text-[10px] font-medium text-[#1f150c]/[.65] transition hover:bg-[#1f150c]/[.05] disabled:opacity-50 dark:border-[#e1dcc9]/[.10] dark:text-[#e1dcc9]/[.58] dark:hover:bg-white/[.05]" disabled={actionId === approval.id} onclick={() => decide(approval.id, 'deny')}><CircleX size={13} strokeWidth={1.8} class="mr-1 inline-block align-[-2px]" /> Deny</button>
              <button class="rounded-lg border border-[#1f150c]/[.12] px-3 py-1.5 text-[10px] font-medium text-[#1f150c]/[.65] transition hover:bg-[#412d15]/[.05] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#e1dcc9]/[.10] dark:text-[#e1dcc9]/[.58] dark:hover:bg-white/[.05]" disabled={actionId === approval.id} title="Allow this operation once." onclick={() => decide(approval.id, 'approve')}><CircleCheck size={13} strokeWidth={1.8} class="mr-1 inline-block align-[-2px]" /> Allow once</button>
              <button class="rounded-lg border border-[#1f150c]/[.12] px-3 py-1.5 text-[10px] font-medium text-[#1f150c]/[.65] transition hover:bg-[#412d15]/[.05] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#e1dcc9]/[.10] dark:text-[#e1dcc9]/[.58] dark:hover:bg-white/[.05]" disabled={actionId === approval.id || !approval.sessionId || approval.risk === 'high'} title={approval.risk === 'high' ? 'High-risk operations always require approval.' : approval.sessionId ? 'Allow this tool for the rest of this session.' : 'This request has no session scope.'} onclick={() => decide(approval.id, 'approve-session')}><CircleCheck size={13} strokeWidth={1.8} class="mr-1 inline-block align-[-2px]" /> Allow for session</button>
            </div>
          </div>
          <div class="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.35fr)]">
            <pre class="max-h-56 overflow-auto rounded-lg border border-[#1f150c]/[.08] bg-[#1f150c]/[.03] p-3 font-mono text-[10px] leading-relaxed text-[#1f150c]/[.70] dark:border-[#e1dcc9]/[.08] dark:bg-black/40 dark:text-[#e1dcc9]/[.55]">{formatArgs(approval.args)}</pre>
            <div class="text-[10px] leading-relaxed text-[#1f150c]/[.48] dark:text-[#e1dcc9]/[.40]">
              <div class="mb-2 text-[9px] uppercase tracking-wider text-[#1f150c]/[.36] dark:text-[#e1dcc9]/[.30]">Why approval</div>
              <p>{approval.reason || 'This operation requires confirmation before execution.'}</p>
              {#if approval.sessionId}<p class="mt-3 break-all">Session: {approval.sessionId}</p>{/if}
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</PagePanel>
</div>
