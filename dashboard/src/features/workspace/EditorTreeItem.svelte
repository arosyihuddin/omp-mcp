<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';
  import type { WorkspaceItem } from '$lib/types';
  import { errorMessage, workspaceApi } from '$lib/api';
  import { joinPath } from './file-utils';
  import FileIcon from './FileIcon.svelte';
  import EditorTreeItem from './EditorTreeItem.svelte';

  let { item, path, depth = 0, activePath = '', onOpen }: {
    item: WorkspaceItem;
    path: string;
    depth?: number;
    activePath?: string;
    onOpen: (path: string, permanent: boolean) => void;
  } = $props();

  let expanded = $state(false);
  let loading = $state(false);
  let children = $state<WorkspaceItem[]>([]);
  let loadError = $state('');

  const visibleChildren = $derived(children
    .toSorted((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));

  async function activate() {
    if (item.type !== 'directory') {
      onOpen(path, false);
      return;
    }
    if (expanded) {
      expanded = false;
      return;
    }
    expanded = true;
    if (children.length > 0 || loadError) return;
    loading = true;
    loadError = '';
    try {
      const data = await workspaceApi.list(path);
      children = data.items ?? [];
    } catch (cause) {
      loadError = errorMessage(cause, 'Unable to read folder');
    } finally {
      loading = false;
    }
  }
</script>

<button
  class={['flex min-h-8 w-full items-center gap-2 rounded-md pr-2 text-left transition-colors', activePath === path ? 'bg-surface-active text-fg' : 'text-fg-muted hover:bg-surface-hover hover:text-fg']}
  style={'padding-left: ' + (8 + depth * 14) + 'px'}
  title={item.name}
  aria-expanded={item.type === 'directory' ? expanded : undefined}
  onclick={() => void activate()}
  ondblclick={() => { if (item.type === 'file') onOpen(path, true); }}
>
  {#if item.type === 'directory'}
    <ChevronRight size={13} class={['shrink-0 text-fg-faint transition-transform', expanded ? 'rotate-90' : '']} />
  {:else}
    <span class="w-[13px] shrink-0"></span>
  {/if}
  <FileIcon {item} />
  <span class="min-w-0 flex-1 truncate">{item.name}</span>
</button>

{#if item.type === 'directory' && expanded}
  {#if loading}
    <p class="py-1 text-xs text-fg-faint" style={'padding-left: ' + (28 + depth * 14) + 'px'}>Loading…</p>
  {:else if loadError}
    <button class="w-full py-1 text-left text-xs text-danger" style={'padding-left: ' + (28 + depth * 14) + 'px'} onclick={() => { children = []; loadError = ''; void activate(); }}>{loadError}</button>
  {:else if visibleChildren.length === 0}
    <p class="py-1 text-xs text-fg-faint" style={'padding-left: ' + (28 + depth * 14) + 'px'}>Empty folder</p>
  {:else}
    {#each visibleChildren as child (child.name)}
      <EditorTreeItem item={child} path={joinPath(path, child.name)} depth={depth + 1} {activePath} {onOpen} />
    {/each}
  {/if}
{/if}
