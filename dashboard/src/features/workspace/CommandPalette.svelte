<script lang="ts">
  import { Search, FilePlus2, FolderOpen, Save, Files, Maximize2, RefreshCw, File, LoaderCircle } from '@lucide/svelte';
  import { Modal, Input } from '$lib/components/ui';
  import { workspaceApi } from '$lib/api';
  import { joinPath } from './file-utils';

  interface Props {
    open: boolean;
    root?: string;
    onclose: () => void;
    onaction: (action: string) => void;
    onselectfile: (path: string) => void;
  }
  let { open, root = '.', onclose, onaction, onselectfile }: Props = $props();
  let query = $state('');
  let files = $state<{ path: string; name: string }[]>([]);
  let loadingFiles = $state(false);
  let hasIndexed = $state(false);
  let loadError = $state('');
  let selectedIndex = $state(0);
  let resultsContainer: HTMLDivElement;
  let requestId = 0;

  const commands = [
    { id: 'open-file', label: 'Open File…', detail: 'Browse workspace files', icon: FilePlus2, keywords: 'file browse open' },
    { id: 'open-folder', label: 'Open Folder…', detail: 'Choose a workspace folder', icon: FolderOpen, keywords: 'folder directory workspace' },
    { id: 'save', label: 'Save', detail: 'Save the current file', icon: Save, keywords: 'write editor' },
    { id: 'save-all', label: 'Save All', detail: 'Save all open files', icon: Save, keywords: 'write all' },
    { id: 'toggle-explorer', label: 'Toggle Explorer', detail: 'Show or hide the file tree', icon: Files, keywords: 'sidebar tree' },
    { id: 'refresh', label: 'Refresh Explorer', detail: 'Reload workspace files', icon: RefreshCw, keywords: 'reload update' },
    { id: 'fullscreen', label: 'Toggle Fullscreen', detail: 'Expand or restore the editor', icon: Maximize2, keywords: 'full screen expand' },
  ];

  const filteredCommands = $derived(commands.filter((item) =>
    (item.label + ' ' + item.detail + ' ' + item.keywords).toLowerCase().includes(query.trim().toLowerCase())
  ));
  const filteredFiles = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return files.filter((file) => (file.name + ' ' + file.path).toLowerCase().includes(needle)).slice(0, 100);
  });
  const results = $derived([
    ...filteredFiles.map((file) => ({ kind: 'file' as const, id: file.path, label: file.name, detail: file.path, icon: File })),
    ...filteredCommands.map((item) => ({ kind: 'command' as const, id: item.id, label: item.label, detail: item.detail, icon: item.icon })),
  ]);

  async function indexFiles() {
    const id = ++requestId;
    loadingFiles = true;
    loadError = '';
    const found: { path: string; name: string }[] = [];
    const queue = [root || '.'];
    const visited = new Set<string>();
    try {
      while (queue.length && found.length < 5000 && visited.size < 1500) {
        const dir = queue.shift()!;
        if (visited.has(dir)) continue;
        visited.add(dir);
        try {
          const data = await workspaceApi.list(dir);
          for (const item of data.items ?? []) {
            if (item.name.startsWith('.') || item.ignored) continue;
            const path = joinPath(data.path, item.name);
            if (item.type === 'directory') queue.push(path);
            else found.push({ path, name: item.name });
            if (found.length >= 5000) break;
          }
        } catch {
          // Skip unreadable folders and continue indexing the rest.
        }
      }
      if (id === requestId) files = found;
    } catch {
      if (id === requestId) loadError = 'Unable to search workspace files.';
    } finally {
      if (id === requestId) {
        loadingFiles = false;
        hasIndexed = true;
      }
    }
  }

  function chooseResult(index: number) {
    const item = results[index];
    if (!item) return;
    query = '';
    if (item.kind === 'file') onselectfile(item.id);
    else onaction(item.id);
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      selectedIndex = (selectedIndex + 1) % results.length;
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      selectedIndex = (selectedIndex - 1 + results.length) % results.length;
    } else if (event.key === 'Enter' && results.length) {
      event.preventDefault();
      chooseResult(selectedIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onclose();
    }
  }

  $effect(() => {
    if (open) {
      query = '';
      selectedIndex = 0;
    } else {
      requestId++;
    }
  });
  $effect(() => {
    if (open && query.trim() && !hasIndexed && !loadingFiles) void indexFiles();
  });
  $effect(() => { query; selectedIndex = 0; });
  $effect(() => {
    const index = selectedIndex;
    if (!open) return;
    const selected = resultsContainer?.querySelector<HTMLElement>(`[data-result-index="${index}"]`);
    selected?.scrollIntoView({ block: 'nearest' });
  });
</script>

<Modal {open} title="Command Center" width="max-w-xl" onclose={onclose} autofocus>
  <div class="flex flex-col gap-2">
    <div class="relative">
      <Search size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
      <Input bind:value={query} placeholder="Search files by name or run a command…" onkeydown={keydown} class="pl-9" autofocus />
    </div>
    <div bind:this={resultsContainer} class="max-h-[min(55vh,440px)] overflow-y-auto py-1">
      {#if results.length}
        {#each results as item, index (item.kind + ':' + item.id)}
          {@const Icon = item.icon}
          <button type="button" data-result-index={index} onclick={() => chooseResult(index)} class={['command-result flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent', selectedIndex === index ? 'is-selected' : '']}>
            <span class="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-fg-subtle"><Icon size={16} /></span>
            <span class="min-w-0 flex-1"><span class="block truncate text-sm text-fg">{item.label}</span><span class="block truncate text-xs text-fg-subtle">{item.detail}</span></span>
            {#if selectedIndex === index}<span class="text-[10px] text-fg-faint">↵</span>{/if}
          </button>
        {/each}
      {:else if loadingFiles && query.trim()}
        <div class="flex items-center justify-center gap-2 px-3 py-8 text-sm text-fg-subtle"><LoaderCircle size={15} class="animate-spin" /> Searching workspace…</div>
      {:else if query.trim()}
        <div class="px-3 py-8 text-center text-sm text-fg-subtle">No matching files or commands</div>
      {:else}
        <div class="px-3 py-4 text-xs text-fg-subtle">Type to search files across the workspace or find a command.</div>
        {#each filteredCommands as item (item.id)}
          {@const Icon = item.icon}
          <button type="button" onclick={() => onaction(item.id)} class="command-result flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-fg-subtle"><Icon size={16} /></span>
            <span class="min-w-0 flex-1"><span class="block text-sm text-fg">{item.label}</span><span class="block truncate text-xs text-fg-subtle">{item.detail}</span></span>
          </button>
        {/each}
      {/if}
      {#if loadError}<p class="px-3 py-2 text-xs text-danger">{loadError}</p>{/if}
    </div>
    <div class="flex items-center gap-3 border-t border-line pt-2 text-[11px] text-fg-faint"><span>↑↓ Navigate</span><span>↵ Open / Run</span><span>Esc Close</span>{#if loadingFiles}<span class="ml-auto">Indexing files…</span>{/if}</div>
  </div>
</Modal>

<style>
  .command-result:hover,
  .command-result.is-selected {
    background-color: color-mix(in srgb, rgb(var(--c-surface-hover)) 94%, white);
  }
</style>
