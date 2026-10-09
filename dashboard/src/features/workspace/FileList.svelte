<script lang="ts">
  import { Star } from '@lucide/svelte';
  import { EmptyState, IconButton } from '$lib/components/ui';
  import type { WorkspaceItem } from '$lib/types';
  import { formatDateShort, formatSize } from '$lib/utils/format';
  import { rowShortcut, type FileActions, type RowInteractions } from './actions';
  import FileIcon from './FileIcon.svelte';
  import FileItemMenu from './FileItemMenu.svelte';
  import { isHidden, joinPath } from './file-utils';
  import InlineNameInput from './InlineNameInput.svelte';
  import { prefs } from './preferences.svelte';

  interface Props {
    items: WorkspaceItem[];
    basePath: string;
    actions: FileActions;
    rows: RowInteractions;
    emptyText: string;
  }

  let { items, basePath, actions, rows, emptyText }: Props = $props();

  const cols = 'grid-cols-[1fr_auto] sm:grid-cols-[1fr_90px_150px_64px]';
</script>

{#if items.length === 0 && !rows.creating}
  <EmptyState title={emptyText} />
{:else}
  <div class="overflow-hidden rounded-lg border border-line bg-surface-raised">
    <div class={['eyebrow grid gap-3 border-b border-line px-4 py-2', cols]}>
      <span>Name</span>
      <span class="hidden sm:block">Size</span>
      <span class="hidden text-right sm:block">Modified</span>
      <span class="sr-only sm:not-sr-only"></span>
    </div>
    <div class="divide-y divide-line">
      {#if rows.creating}
        <div class={['grid items-center gap-3 px-4 py-1.5', cols]}>
          <div class="flex min-w-0 items-center gap-2.5 py-0.5">
            <FileIcon item={{ name: '', type: rows.creating }} />
            {#key rows.attempt}<InlineNameInput value={rows.draft} label={rows.creating === 'file' ? 'New file name' : 'New folder name'} oncommit={rows.oncreate} oncancel={rows.oncancel} />{/key}
          </div>
          {#if rows.error}<span class="col-span-full text-sm text-danger" role="alert">{rows.error}</span>{/if}
        </div>
      {/if}
      {#each items as item (item.name)}
        {@const path = joinPath(basePath, item.name)}
        {@const favorite = prefs.isFavorite(path)}
        <div
          role="row"
          tabindex="-1"
          class={['group grid items-center gap-3 px-4 py-1.5 transition-colors hover:bg-surface-hover', cols]}
          oncontextmenu={(event) => rows.oncontext(event, item, path)}
          onkeydown={(event) => rowShortcut(event, item, path, actions)}
        >
          {#if rows.renaming === item.name}
            <div class="flex min-w-0 items-center gap-2.5 py-0.5">
              <FileIcon {item} />
              {#key rows.attempt}<InlineNameInput value={rows.draft || item.name} label="Rename {item.name}" oncommit={(name) => rows.onrename(item, name)} oncancel={rows.oncancel} />{/key}
            </div>
            {#if rows.error}<span class="col-span-full text-sm text-danger" role="alert">{rows.error}</span>{/if}
          {:else}
            <button type="button" class="flex min-w-0 items-center gap-2.5 py-1 text-left" onclick={() => actions.open(item, path)}>
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
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}
