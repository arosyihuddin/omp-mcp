<script lang="ts">
  import {
    Copy,
    CopyPlus,
    Download,
    ExternalLink,
    FilePlus,
    FolderInput,
    FolderOpen,
    FolderPlus,
    Info,
    Link,
    Pencil,
    Pin,
    PinOff,
    Square,
    Star,
    Trash2,
  } from '@lucide/svelte';
  import { MenuItem } from '$lib/components/ui';
  import type { WorkspaceItem } from '$lib/types';
  import type { FileActions } from './actions';
  import { prefs } from './preferences.svelte';

  interface Props {
    item: WorkspaceItem;
    path: string;
    actions: FileActions;
    close: () => void;
  }

  let { item, path, actions, close }: Props = $props();

  const isDir = $derived(item.type === 'directory');
  const favorite = $derived(prefs.isFavorite(path));
  const pinned = $derived(prefs.isPinned(path));

  /** Run the action before closing so reactive item/path props remain available. */
  const run = (fn: () => void) => () => {
    fn();
    close();
  };
</script>

<MenuItem onclick={run(() => actions.open(item, path))}>
  {#if isDir}<FolderOpen size={13} /> Open{:else}<ExternalLink size={13} /> Open{/if}
</MenuItem>
{#if actions.openInEditor}
  <MenuItem onclick={run(() => actions.openInEditor?.(item, path))}>
    <Square size={13} class="opacity-0" />
    {isDir ? 'Open as project in Editor' : 'Open in Editor'}
  </MenuItem>
{/if}

{#if isDir && actions.newIn}
  <div role="separator" class="my-1 h-px bg-line"></div>
  <MenuItem onclick={run(() => actions.newIn?.(item, path, 'file'))}><FilePlus size={13} /> New file here</MenuItem>
  <MenuItem onclick={run(() => actions.newIn?.(item, path, 'directory'))}><FolderPlus size={13} /> New folder here</MenuItem>
{/if}

{#if actions.rename || actions.duplicate || actions.move}
  <div role="separator" class="my-1 h-px bg-line"></div>
  {#if actions.rename}
    <MenuItem class="justify-between" onclick={run(() => actions.rename?.(item, path))}>
      <span class="flex items-center gap-2"><Pencil size={13} /> Rename</span>
      <kbd class="text-xs text-fg-faint">F2</kbd>
    </MenuItem>
  {/if}
  {#if actions.duplicate}<MenuItem onclick={run(() => actions.duplicate?.(item, path))}><CopyPlus size={13} /> Duplicate</MenuItem>{/if}
  {#if actions.move}<MenuItem onclick={run(() => actions.move?.(item, path))}><FolderInput size={13} /> Move to…</MenuItem>{/if}
{/if}

<div role="separator" class="my-1 h-px bg-line"></div>
{#if isDir}
  <MenuItem onclick={run(() => void prefs.togglePin(path, item.name))}>
    {#if pinned}<PinOff size={13} /> Unpin from sidebar{:else}<Pin size={13} /> Pin to sidebar{/if}
  </MenuItem>
{/if}
<MenuItem onclick={run(() => void prefs.toggleFavorite(path, item.name, item.type))}>
  <Star size={13} class={favorite ? 'fill-current text-warning' : ''} />
  {favorite ? 'Remove from favorites' : 'Add to favorites'}
</MenuItem>

{#if actions.copyPath || (!isDir && actions.download)}
  <div role="separator" class="my-1 h-px bg-line"></div>
  {#if actions.copyPath}
    <MenuItem onclick={run(() => actions.copyPath?.(item, path, false))}><Copy size={13} /> Copy path</MenuItem>
    <MenuItem onclick={run(() => actions.copyPath?.(item, path, true))}><Link size={13} /> Copy relative path</MenuItem>
  {/if}
  {#if !isDir && actions.download}
    <MenuItem onclick={run(() => actions.download?.(item, path))}><Download size={13} /> Download</MenuItem>
  {/if}
{/if}

{#if actions.properties || actions.remove}
  <div role="separator" class="my-1 h-px bg-line"></div>
  {#if actions.properties}<MenuItem onclick={run(() => actions.properties?.(item, path))}><Info size={13} /> Properties</MenuItem>{/if}
  {#if actions.remove}
    <MenuItem tone="danger" class="justify-between" onclick={run(() => actions.remove?.(item, path))}>
      <span class="flex items-center gap-2"><Trash2 size={13} /> Delete</span>
      <kbd class="text-xs opacity-60">Del</kbd>
    </MenuItem>
  {/if}
{/if}
