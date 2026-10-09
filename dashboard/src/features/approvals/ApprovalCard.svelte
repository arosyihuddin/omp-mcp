<script lang="ts">
  import { CircleCheck, CircleX, ShieldAlert } from '@lucide/svelte';
  import RiskBadge from '$lib/components/domain/RiskBadge.svelte';
  import { Button, Card, CodeBlock } from '$lib/components/ui';
  import type { Approval, ApprovalDecision } from '$lib/types';
  import { formatTime } from '$lib/utils/format';

  interface Props {
    approval: Approval;
    busy?: boolean;
    ondecide: (decision: ApprovalDecision) => void;
  }

  let { approval, busy = false, ondecide }: Props = $props();

  const sessionAllowed = $derived(!!approval.sessionId && approval.risk !== 'high');
  const sessionHint = $derived(
    approval.risk === 'high'
      ? 'High-risk operations always require approval.'
      : approval.sessionId
        ? 'Allow this tool for the rest of this session.'
        : 'This request has no session scope.',
  );
</script>

<Card class="overflow-hidden bg-surface">
  <div class="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <ShieldAlert size={14} strokeWidth={1.8} class="shrink-0 text-warning" />
        <h3 class="truncate font-mono text-base font-medium text-fg">{approval.tool}</h3>
        <RiskBadge risk={approval.risk} />
      </div>
      <p class="mt-1 text-sm text-fg-subtle">Requested {formatTime(approval.createdAt)} · Request {approval.requestId}</p>
    </div>
    <div class="flex shrink-0 flex-wrap gap-2">
      <Button size="sm" variant="danger" disabled={busy} onclick={() => ondecide('deny')}><CircleX size={13} /> Deny</Button>
      <Button size="sm" disabled={busy} title="Allow this operation once." onclick={() => ondecide('approve')}>
        <CircleCheck size={13} /> Allow once
      </Button>
      <Button size="sm" variant="primary" disabled={busy || !sessionAllowed} title={sessionHint} onclick={() => ondecide('approve-session')}>
        <CircleCheck size={13} /> Allow for session
      </Button>
    </div>
  </div>
  <div class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.35fr)]">
    <CodeBlock code={JSON.stringify(approval.args, null, 2)} class="max-h-56" />
    <div class="text-sm text-fg-subtle">
      <div class="eyebrow mb-2">Why approval</div>
      <p>{approval.reason || 'This operation requires confirmation before execution.'}</p>
      {#if approval.sessionId}<p class="mt-3 break-all font-mono text-xs">Session: {approval.sessionId}</p>{/if}
    </div>
  </div>
</Card>
