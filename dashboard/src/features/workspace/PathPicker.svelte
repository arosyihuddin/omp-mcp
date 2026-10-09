<script lang="ts">
  import { ArrowUp, ChevronRight, Eye, EyeOff, Home } from '@lucide/svelte';
  import { Button, EmptyState, IconButton, Modal, SearchInput, Skeleton } from '$lib/components/ui';
  import { errorMessage, workspaceApi } from '$lib/api';
  import type { WorkspaceItem } from '$lib/types';
  import { formatDateShort, formatSize } from '$lib/utils/format';
  import { dirname, displayPath, isHidden, joinPath } from './file-utils';
  import FileIcon from './FileIcon.svelte';

  interface Props {
    open: boolean;
    /** `file` picks a file; `directory` picks a folder (also used for "Move to…"). */
    mode: 'file' | 'directory';
    title?: string;
    /** Workspace-relative directory to start in ("." = home). */
    initialPath?: string;
    confirmLabel?: string;
    /** Error from the caller's action (e.g. a failed move) shown above the footer. */
    error?: string;
    onselect: (path: string) => void;
    oncancel: () => void;
  }

  let { open, mode, title, initialPath = '.', confirmLabel, error = '', onselect, oncancel }: Props = $props();

  let current = $state('.');
  let items = $state<WorkspaceItem[]>([]);
  let loading = $state(false);
  let loadError = $state('');
  let filter = $state('');
  let showHidden = $state(false);
  let selected = $state<string | null>(null);
  let seq = 0;
  let listContainer: HTMLDivElement;

  const heading = $derived(title ?? (mode === 'file' ? 'Open File' : 'Open Folder'));
  const action = $derived(confirmLabel ?? 'Open');

  const crumbs = $derived.by(() => {
    const parts = current === '.' ? [] : current.split('/').filter(Boolean);
    return parts.map((name, index) => ({ name, path: parts.slice(0, index + 1).join('/') }));
  });

  const visible = $derived.by(() => {
    const needle = filter.trim().toLowerCase();
    return items
      .filter((item) => (showHidden || !isHidden(item.name)) && (!needle || item.name.toLowerCase().includes(needle)))
      .toSorted((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1));
  });

  /** What the primary button will open: the highlighted row, or (folder mode) the folder being browsed. */
  const target = $derived(selected ?? (mode === 'directory' ? current : null));

  async function load(path: string) {
    const id = ++seq;
    loading = true;
    loadError = '';
    selected = null;
    try {
      const data = await workspaceApi.list(path);
      if (id !== seq) return;
      current = data.path;
      items = data.items ?? [];
      filter = '';
    } catch (cause) {
      if (id === seq) loadError = errorMessage(cause, 'Unable to read folder');
    } finally {
      if (id === seq) loading = false;
    }
  }

  $effect(() => {
    selected;
    const row = listContainer?.querySelector<HTMLElement>('[aria-selected="true"]');
    row?.scrollIntoView({ block: 'nearest' });
  });

  $effect(() => {
    if (open) void load(initialPath);
  });

  function activate(item: WorkspaceItem) {
    const path = joinPath(current, item.name);
    if (item.type === 'directory') void load(path);
    else if (mode === 'file') onselect(path);
  }

  function pick(item: WorkspaceItem) {
    // In file mode folders are navigation only; in folder mode files can't be chosen.
    if (mode === 'file' && item.type === 'directory') return void load(joinPath(current, item.name));
    if (mode === 'directory' && item.type === 'file') return;
    selected = joinPath(current, item.name);
  }

  function submit() {
    if (target) onselect(target);
  }


  function onListKeydown(event: KeyboardEvent) {
    const rows = visible.filter((item) => mode === 'file' || item.type === 'directory');
    const index = rows.findIndex((item) => joinPath(current, item.name) === selected);
    const typingInFilter = event.target instanceof HTMLInputElement;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (rows.length === 0) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = index < 0 ? (direction === 1 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, index + direction));
      selected = joinPath(current, rows[nextIndex].name);
    } else if (event.key === 'Enter' && index >= 0) {
      event.preventDefault();
      activate(rows[index]);
    } else if (event.key === ' ' && index >= 0 && !typingInFilter) {
      event.preventDefault();
      pick(rows[index]);
    } else if ((event.key === 'Backspace' || event.key === 'ArrowLeft') && current !== '.' && filter === '' && !typingInFilter) {
      event.preventDefault();
      void load(dirname(current));
    } else if (event.key === 'ArrowRight' && index >= 0 && rows[index].type === 'directory' && !typingInFilter) {
      event.preventDefault();
      void load(joinPath(current, rows[index].name));
    }
  }
</script>

<Modal {open} title={heading} width="max-w-2xl" onclose={oncancel} autofocus>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="flex h-[min(60vh,480px)] flex-col" role="group" aria-label="Folder picker keyboard navigation" onkeydown={onListKeydown}>
    <div class="flex items-center gap-2 border-b border-line px-3 py-2">
      <IconButton label="Up one level" size="sm" disabled={current === '.'} onclick={() => load(dirname(current))}>
        <ArrowUp size={15} />
      </IconButton>
      <nav class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-sm" aria-label="Path">
        <button
          type="button"
          class="flex h-6 shrink-0 items-center gap-1 rounded px-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg"
          onclick={() => load('.')}
        >
          <Home size={13} /> Home
        </button>
        {#each crumbs as crumb (crumb.path)}
          <ChevronRight size={13} class="shrink-0 text-fg-faint" />
          <button
            type="button"
            class="h-6 shrink-0 rounded px-1.5 text-fg-muted hover:bg-surface-hover hover:text-fg"
            onclick={() => load(crumb.path)}
          >
            {crumb.name}
          </button>
        {/each}
      </nav>
      <IconButton label={showHidden ? 'Hide hidden files' : 'Show hidden files'} size="sm" active={showHidden} onclick={() => (showHidden = !showHidden)}>
        {#if showHidden}<Eye size={15} />{:else}<EyeOff size={15} />{/if}
      </IconButton>
    </div>

    <div class="border-b border-line px-3 py-2">
      <SearchInput bind:value={filter} placeholder="Filter this folder…" label="Filter this folder" />
    </div>

    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div bind:this={listContainer} class="min-h-0 flex-1 overflow-auto outline-none" role="listbox" tabindex="0" aria-label="Folder contents">
      {#if loading && items.length === 0}
        <div class="space-y-1 p-2">
          {#each Array.from({ length: 6 }, (_, index) => index) as row (row)}<Skeleton class="h-9 w-full" />{/each}
        </div>
      {:else if loadError}
        <EmptyState title="Can't open this folder" description={loadError}>
          <Button size="sm" onclick={() => load(current)}>Retry</Button>
        </EmptyState>
      {:else if visible.length === 0}
        <EmptyState title={filter ? 'No matches' : 'This folder is empty'} class="py-10" />
      {:else}
        <ul class="p-1.5">
          {#each visible as item (item.name)}
            {@const path = joinPath(current, item.name)}
            {@const disabled = mode === 'directory' && item.type === 'file'}
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={selected === path}
                {disabled}
                class={[
                  'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-base transition-colors',
                  selected === path ? 'bg-surface-active text-fg ring-1 ring-accent/50' : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
                  disabled && 'cursor-default opacity-40 hover:bg-transparent hover:text-fg-muted',
                ]}
                onclick={() => pick(item)}
                ondblclick={() => activate(item)}
              >
                <FileIcon {item} />
                <span class="min-w-0 flex-1 truncate">{item.name}</span>
                <span class="hidden w-16 shrink-0 text-right text-xs text-fg-faint sm:block">{item.type === 'file' ? formatSize(item.size) : ''}</span>
                <span class="hidden w-20 shrink-0 text-right text-xs text-fg-faint sm:block">{formatDateShort(item.modified)}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    {#if error}<p class="border-t border-line px-4 py-2 text-sm text-danger" role="alert">{error}</p>{/if}
  </div>

  {#snippet footer()}
    <p class="mr-auto min-w-0 flex-1 self-center truncate font-mono text-xs text-fg-faint" title={target ? displayPath(target) : ''}>
      {target ? displayPath(target) : mode === 'file' ? 'Select a file' : ''}
    </p>
    <Button size="sm" variant="ghost" onclick={oncancel}>Cancel</Button>
    <Button size="sm" variant="primary" disabled={!target} onclick={submit}>
      {mode === 'directory' && !selected ? `${action} this folder` : action}
    </Button>
  {/snippet}
</Modal>
