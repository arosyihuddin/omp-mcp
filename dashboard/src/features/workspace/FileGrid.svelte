<script lang="ts">
  import { EmptyState } from '$lib/components/ui';
  import type { WorkspaceItem } from '$lib/types';
  import { rowShortcut, type FileActions, type RowInteractions } from './actions';
  import FileIcon from './FileIcon.svelte';
  import FileItemMenu from './FileItemMenu.svelte';
  import { isHidden, joinPath } from './file-utils';
  import InlineNameInput from './InlineNameInput.svelte';

  interface Props {
    items: WorkspaceItem[];
    basePath: string;
    actions: FileActions;
    rows: RowInteractions;
    emptyText: string;
  }

  let { items, basePath, actions, rows, emptyText }: Props = $props();

  const card = 'group relative min-w-0 rounded-lg border border-line bg-surface-raised transition-colors hover:bg-surface-hover';
  const tile = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-active/60';
</script>

{#if items.length === 0 && !rows.creating}
  <EmptyState title={emptyText} />
{:else}
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
    {#if rows.creating}
      <div class={card}>
        <div class="flex items-center gap-3 p-3">
          <span class={tile}><FileIcon item={{ name: '', type: rows.creating }} size={17} /></span>
          {#key rows.attempt}<InlineNameInput value={rows.draft} label={rows.creating === 'file' ? 'New file name' : 'New folder name'} oncommit={rows.oncreate} oncancel={rows.oncancel} />{/key}
        </div>
        {#if rows.error}<p class="px-3 pb-2 text-sm text-danger" role="alert">{rows.error}</p>{/if}
      </div>
    {/if}
    {#each items as item (item.name)}
      {@const path = joinPath(basePath, item.name)}
      <div
        role="row"
        tabindex="-1"
        class={card}
        oncontextmenu={(event) => rows.oncontext(event, item, path)}
        onkeydown={(event) => rowShortcut(event, item, path, actions)}
      >
        {#if rows.renaming === item.name}
          <div class="flex items-center gap-3 p-3">
            <span class={tile}><FileIcon {item} size={17} /></span>
            {#key rows.attempt}<InlineNameInput value={rows.draft || item.name} label="Rename {item.name}" oncommit={(name) => rows.onrename(item, name)} oncancel={rows.oncancel} />{/key}
          </div>
          {#if rows.error}<p class="px-3 pb-2 text-sm text-danger" role="alert">{rows.error}</p>{/if}
        {:else}
          <button type="button" class="flex w-full min-w-0 items-center gap-3 p-3 pr-10 text-left" onclick={() => actions.open(item, path)}>
            <span class={tile}><FileIcon {item} size={17} /></span>
            <span class={['min-w-0 truncate text-base text-fg', isHidden(item.name) && 'opacity-60']}>{item.name}</span>
          </button>
          <div class="absolute right-1.5 top-1/2 -translate-y-1/2">
            <FileItemMenu {item} {path} {actions} />
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
