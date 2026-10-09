<script lang="ts">
  import { ChevronDown, FileClock } from '@lucide/svelte';
  import { CodeBlock, EmptyState } from '$lib/components/ui';
  import type { Approval } from '$lib/types';
  import { formatTime } from '$lib/utils/format';
  import { decisionIcon, decisionLabel, decisionTextClass } from './decision';

  interface Props {
    items: Approval[];
    limit?: number;
  }

  let { items, limit = 12 }: Props = $props();

  let expandedId = $state('');
  const visible = $derived(items.slice(0, limit));
</script>

{#if items.length === 0}
  <EmptyState icon={FileClock} title="No approval history" description="Completed approval decisions will appear here." />
{:else}
  <div class="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
    {#each visible as approval (approval.id)}
      {@const Icon = decisionIcon(approval)}
      {@const open = expandedId === approval.id}
      <div>
        <button
          type="button"
          class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
          aria-expanded={open}
          onclick={() => (expandedId = open ? '' : approval.id)}
        >
          <Icon size={14} strokeWidth={1.8} class={['shrink-0', decisionTextClass(approval)]} />
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center gap-2">
              <span class="truncate font-mono text-sm text-fg-muted">{approval.tool}</span>
              <span class={['shrink-0 text-xs', decisionTextClass(approval)]}>{decisionLabel(approval)}</span>
            </div>
            <div class="mt-0.5 truncate text-xs text-fg-faint">Request {approval.requestId}</div>
          </div>
          <span class="shrink-0 text-xs tabular-nums text-fg-faint">{formatTime(approval.updatedAt)}</span>
          <ChevronDown size={13} strokeWidth={1.8} class={['shrink-0 text-fg-faint transition-transform', !open && '-rotate-90']} />
        </button>
        {#if open}
          <div class="border-t border-line bg-canvas/40 px-3 pb-3 pt-2.5">
            <div class="eyebrow mb-1.5">Tool parameters</div>
            <CodeBlock code={JSON.stringify(approval.args, null, 2)} />
          </div>
        {/if}
      </div>
    {/each}
  </div>
  {#if items.length > limit}
    <p class="mt-2 text-center text-xs text-fg-faint">Showing the latest {limit} of {items.length} decisions.</p>
  {/if}
{/if}
