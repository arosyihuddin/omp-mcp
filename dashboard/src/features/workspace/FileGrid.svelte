<script lang="ts">
  import { EmptyState } from '$lib/components/ui';
  import type { WorkspaceItem } from '$lib/types';
  import type { FileActions } from './actions';
  import FileIcon from './FileIcon.svelte';
  import FileItemMenu from './FileItemMenu.svelte';
  import { isHidden, joinPath } from './file-utils';

  interface Props {
    items: WorkspaceItem[];
    basePath: string;
    actions: FileActions;
    emptyText: string;
  }

  let { items, basePath, actions, emptyText }: Props = $props();
</script>

{#if items.length === 0}
  <EmptyState title={emptyText} />
{:else}
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
    {#each items as item (item.name)}
      {@const path = joinPath(basePath, item.name)}
      <div class="group relative min-w-0 rounded-lg border border-line bg-surface-raised transition-colors hover:bg-surface-hover">
        <button type="button" class="flex w-full min-w-0 items-center gap-3 p-3 pr-10 text-left" onclick={() => actions.open(item)}>
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-active/60">
            <FileIcon {item} size={17} />
          </span>
          <span class={['min-w-0 truncate text-base text-fg', isHidden(item.name) && 'opacity-60']}>{item.name}</span>
        </button>
        <div class="absolute right-1.5 top-1/2 -translate-y-1/2">
          <FileItemMenu {item} {path} {actions} />
        </div>
      </div>
    {/each}
  </div>
{/if}
