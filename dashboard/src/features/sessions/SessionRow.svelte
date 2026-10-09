<script lang="ts">
  import { ChevronDown, ExternalLink, Square, X } from '@lucide/svelte';
  import { errorMessage, sessionsApi } from '$lib/api';
  import SessionStatusBadge from '$lib/components/domain/SessionStatusBadge.svelte';
  import { Button, CodeBlock, KeyValue } from '$lib/components/ui';
  import type { Session } from '$lib/types';
  import { formatDateTime } from '$lib/utils/format';

  interface Props {
    session: Session;
  }

  let { session }: Props = $props();

  let expanded = $state(false);
  let busy = $state<'interrupt' | 'dispose' | ''>('');
  let error = $state('');

  const active = $derived(session.status === 'running' || session.status === 'starting');

  async function act(type: 'interrupt' | 'dispose') {
    busy = type;
    error = '';
    try {
      await sessionsApi.act(session.sessionId, type);
      // The list updates via the realtime `session.*` events.
      if (type === 'dispose') expanded = false;
    } catch (err) {
      error = errorMessage(err, `Unable to ${type} session`);
    } finally {
      busy = '';
    }
  }
</script>

<div class="transition-colors hover:bg-surface-hover/60">
  <button
    type="button"
    class="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2.5 text-left text-sm lg:grid-cols-[auto_1.1fr_auto_1.8fr_1fr_auto]"
    aria-expanded={expanded}
    onclick={() => (expanded = !expanded)}
  >
    <ChevronDown size={14} strokeWidth={1.8} class={['text-fg-faint transition-transform', !expanded && '-rotate-90']} />
    <span class="truncate font-mono text-xs text-fg-muted">{session.sessionId}</span>
    <SessionStatusBadge status={session.status} />
    <span class="hidden truncate text-fg-subtle lg:block">{session.task ?? 'No task metadata'}</span>
    <span class="hidden truncate text-fg-subtle lg:block">{session.model ?? '—'}</span>
    <span class="text-xs text-fg-faint">{formatDateTime(session.updatedAt)}</span>
  </button>

  {#if expanded}
    <div class="space-y-4 border-t border-line bg-canvas/40 px-4 py-4">
      <dl class="grid gap-4 sm:grid-cols-2">
        <KeyValue label="Working directory" value={session.cwd} mono />
        <KeyValue label="Created" value={formatDateTime(session.createdAt)} />
        <KeyValue label="Updated" value={formatDateTime(session.updatedAt)} />
        {#if session.collab?.instanceId}<KeyValue label="Collab instance" value={session.collab.instanceId} mono />{/if}
      </dl>

      {#if session.result || session.error}
        <div>
          <div class="eyebrow mb-1.5">{session.error ? 'Error' : 'Latest result'}</div>
          <CodeBlock code={session.error ?? session.result ?? ''} tone={session.error ? 'danger' : 'default'} class="max-h-40" />
        </div>
      {/if}

      {#if error}<p class="text-sm text-danger" role="alert">{error}</p>{/if}

      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex gap-2">
          {#if session.collab?.webUrl}
            <Button size="sm" href={session.collab.webUrl} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Open Web</Button>
          {/if}
          {#if session.collab?.viewUrl}
            <Button size="sm" href={session.collab.viewUrl} target="_blank" rel="noreferrer"><ExternalLink size={12} /> View</Button>
          {/if}
        </div>
        <div class="flex gap-2">
          {#if active}
            <Button size="sm" disabled={!!busy} onclick={() => act('interrupt')}>
              <Square size={11} /> {busy === 'interrupt' ? 'Interrupting…' : 'Interrupt'}
            </Button>
          {/if}
          <Button size="sm" variant="danger" disabled={!!busy} onclick={() => act('dispose')}>
            <X size={11} /> {busy === 'dispose' ? 'Disposing…' : 'Dispose'}
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>
