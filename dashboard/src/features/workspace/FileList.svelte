<script lang="ts">
  import { Star } from '@lucide/svelte';
  import { EmptyState, IconButton } from '$lib/components/ui';
  import type { WorkspaceItem } from '$lib/types';
  import { formatDateShort, formatSize } from '$lib/utils/format';
  import type { FileActions } from './actions';
  import FileIcon from './FileIcon.svelte';
  import FileItemMenu from './FileItemMenu.svelte';
  import { isHidden, joinPath } from './file-utils';
  import { prefs } from './preferences.svelte';

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
  <div class="overflow-hidden rounded-lg border border-line bg-surface-raised">
    <div class="eyebrow grid grid-cols-[1fr_auto] gap-3 border-b border-line px-4 py-2 sm:grid-cols-[1fr_90px_150px_64px]">
      <span>Name</span>
      <span class="hidden sm:block">Size</span>
      <span class="hidden text-right sm:block">Modified</span>
      <span class="sr-only sm:not-sr-only"></span>
    </div>
    <div class="divide-y divide-line">
      {#each items as item (item.name)}
        {@const path = joinPath(basePath, item.name)}
        {@const favorite = prefs.isFavorite(path)}
        <div class="group grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-1.5 transition-colors hover:bg-surface-hover sm:grid-cols-[1fr_90px_150px_64px]">
          <button type="button" class="flex min-w-0 items-center gap-2.5 py-1 text-left" onclick={() => actions.open(item)}>
            <FileIcon {item} />
            <span class={['truncate text-base text-fg', isHidden(item.name) && 'opacity-60']}>{item.name}</span>
          </button>
          <span class="hidden text-xs text-fg-subtle sm:block">{item.type === 'directory' ? 'Directory' : formatSize(item.size)}</span>
          <span class="hidden text-right text-xs text-fg-subtle sm:block">{formatDateShort(item.modified)}</span>
          <div class="flex items-center justify-end gap-0.5">
            <IconButton
              size="sm"
              label={favorite ? 'Remove favorite' : 'Add favorite'}
              class={favorite ? '' : 'sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'}
              onclick={() => prefs.toggleFavorite(path, item.name, item.type)}
            >
              <Star size={13} class={favorite ? 'fill-current text-warning' : ''} />
            </IconButton>
            <div class="sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <FileItemMenu {item} {path} {actions} />
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}
