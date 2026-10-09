<script lang="ts">
  import { PanelLeft, Terminal as TerminalIcon, X } from '@lucide/svelte';
  import { IconButton, Skeleton, StatusDot } from '$lib/components/ui';
  import type { TerminalInfo } from '$lib/types';

  interface Props {
    terminals: TerminalInfo[];
    activeId: string;
    loading: boolean;
    open: boolean;
    oncreate: () => void;
    onopen: (id: string) => void;
    onclose: (id: string) => void;
    ontoggle: () => void;
  }

  let { terminals, activeId, loading, open, oncreate, onopen, onclose, ontoggle }: Props = $props();
</script>

<aside class={['flex shrink-0 flex-col border-r border-line bg-canvas/50 transition-[width] duration-150', open ? 'w-52' : 'w-11']}>
  {#if open}
    <div class="eyebrow flex h-9 items-center px-3">Sessions</div>
    <div class="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-2">
      {#if loading}
        {#each Array(3) as _, index (index)}<Skeleton class="h-8 w-full rounded-md" />{/each}
      {:else if terminals.length === 0}
        <button
          type="button"
          class="mx-1 mt-3 w-[calc(100%-0.5rem)] rounded-md border border-dashed border-line-strong px-3 py-4 text-center text-sm text-fg-subtle transition-colors hover:border-accent/50 hover:text-fg"
          onclick={oncreate}
        >
          Create a terminal
        </button>
      {:else}
        {#each terminals as item (item.id)}
          <div
            class={[
              'group flex items-center rounded-md transition-colors',
              item.id === activeId ? 'bg-surface-active text-fg' : 'text-fg-subtle hover:bg-surface-hover hover:text-fg',
            ]}
          >
            <button type="button" class="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left" onclick={() => onopen(item.id)}>
              <StatusDot tone={item.status === 'running' ? 'success' : 'muted'} />
              <span class="min-w-0 flex-1 truncate text-sm">{item.title}</span>
            </button>
            <button
              type="button"
              class="mr-1 rounded p-1 text-fg-faint opacity-0 transition hover:bg-surface-active hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
              aria-label="Close terminal {item.title}"
              onclick={() => onclose(item.id)}
            >
              <X size={12} strokeWidth={1.8} />
            </button>
          </div>
        {/each}
      {/if}
    </div>
  {:else}
    <div class="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto py-2">
      {#each terminals as item, index (item.id)}
        <button
          type="button"
          class={[
            'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
            item.id === activeId ? 'bg-surface-active text-fg' : 'text-fg-subtle hover:bg-surface-hover hover:text-fg',
          ]}
          aria-label="Open terminal {index + 1}: {item.title}"
          title="{index + 1}. {item.title}"
          onclick={() => onopen(item.id)}
        >
          <TerminalIcon size={14} strokeWidth={1.7} />
          {#if item.status === 'running'}<StatusDot tone="success" class="absolute bottom-0.5 right-0.5" />{/if}
        </button>
      {/each}
    </div>
  {/if}

  <div class="border-t border-line p-1.5">
    <IconButton class="w-full" size="sm" label={open ? 'Hide sessions' : 'Show sessions'} onclick={ontoggle}>
      <PanelLeft size={15} strokeWidth={1.8} />
    </IconButton>
  </div>
</aside>
