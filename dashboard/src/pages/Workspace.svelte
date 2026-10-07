<script lang="ts">
  import { ArrowLeft, ArrowRight, ChevronRight, File, Folder, X } from '@lucide/svelte';

  export let path = '.';
  export let items: { name: string; type: 'directory' | 'file'; size: number | null; modified: string }[] = [];
  export let loading = false;
  export let error = '';
  export let open: (path: string) => void;
  let historyBack: string[] = [];
  let historyForward: string[] = [];

  let selectedPath = '';
  let selectedName = '';
  let preview = '';
  let previewLoading = false;
  let previewError = '';

  async function selectFile(name: string) {
    selectedName = name;
    selectedPath = path === '.' ? name : `${path}/${name}`;
    preview = '';
    previewError = '';
    previewLoading = true;
    try {
      const response = await fetch(`/api/workspace/file?path=${encodeURIComponent(selectedPath)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to preview file');
      preview = data.content ?? '';
    } catch (error) {
      previewError = error instanceof Error ? error.message : 'Unable to preview file';
    } finally {
      previewLoading = false;
    }
  }

  function closePreview() {
    selectedPath = '';
    selectedName = '';
    preview = '';
    previewError = '';
  }

  function navigateTo(nextPath: string, recordHistory = true) {
    if (nextPath === path) return;
    if (recordHistory) {
      historyBack = [...historyBack, path];
      historyForward = [];
    }
    closePreview();
    open(nextPath);
  }

  function goBack() {
    const previous = historyBack.at(-1);
    if (!previous) return;
    historyBack = historyBack.slice(0, -1);
    historyForward = [path, ...historyForward];
    closePreview();
    open(previous);
  }

  function goForward() {
    const next = historyForward[0];
    if (!next) return;
    historyForward = historyForward.slice(1);
    historyBack = [...historyBack, path];
    closePreview();
    open(next);
  }

  function formatSize(size: number | null) {
    if (size === null) return '—';
    if (size < 1024) return `${size} B`;
    if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
    return `${(size / 1024 ** 3).toFixed(1)} GB`;
  }


  function formatDate(value: string) {
    return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
</script>


<div class="space-y-4">
  <section class="relative overflow-hidden rounded-xl border border-[#1f150c]/[.15] bg-[#e1dcc9] shadow-[0_1px_2px_rgba(31,21,12,.08),0_8px_24px_rgba(31,21,12,.05)] dark:border-[#e1dcc9]/[.10] dark:bg-[#1f150c] dark:shadow-[0_1px_2px_rgba(0,0,0,.28),0_8px_30px_rgba(0,0,0,.10)] {selectedPath ? 'h-[calc(100vh-144px)]' : ''}">
    <div class="relative z-[1] flex items-center justify-between border-b border-[#1f150c]/[.10] px-4 py-3 dark:border-[#e1dcc9]/[.10]">
      <div class="flex min-w-0 items-center gap-2">
        <button class="flex h-7 w-7 items-center justify-center rounded-md text-[#412d15]/[.65] transition hover:bg-[#412d15]/[.08] disabled:cursor-not-allowed disabled:opacity-20 dark:text-[#e1dcc9]/[.52] dark:hover:bg-white/[.05]" on:click={goBack} disabled={!historyBack.length} aria-label="Back" title="Back"><ArrowLeft size={14} /></button>
        <button class="flex h-7 w-7 items-center justify-center rounded-md text-[#412d15]/[.65] transition hover:bg-[#412d15]/[.08] disabled:cursor-not-allowed disabled:opacity-20 dark:text-[#e1dcc9]/[.52] dark:hover:bg-white/[.05]" on:click={goForward} disabled={!historyForward.length} aria-label="Forward" title="Forward"><ArrowRight size={14} /></button>
        {#if selectedPath}
          <ChevronRight size={12} class="text-[#412d15]/[.24] dark:text-[#e1dcc9]/[.18]" />
          <span class="truncate font-mono text-[11px] text-[#412d15]/[.68] dark:text-[#e1dcc9]/[.52]">{selectedName}</span>
        {:else}
          <div class="ml-1 flex min-w-0 items-center gap-1 text-[11px]">
            <button class="rounded-md px-2 py-1 font-mono text-[#412d15]/[.70] transition hover:bg-[#412d15]/[.08] dark:text-[#e1dcc9]/[.58] dark:hover:bg-white/[.04]" on:click={() => navigateTo(".")}>workspace</button>
            {#if path !== "."}
              {#each path.split("/").filter(Boolean) as segment, index}
                <ChevronRight size={12} class="text-[#412d15]/[.30] dark:text-[#e1dcc9]/[.22]" />
                <button class="truncate rounded-md px-2 py-1 font-mono text-[#412d15]/[.70] transition hover:bg-[#412d15]/[.08] dark:text-[#e1dcc9]/[.58] dark:hover:bg-white/[.04]" on:click={() => navigateTo(path.split("/").filter(Boolean).slice(0, index + 1).join("/"))}>{segment}</button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
      {#if selectedPath}
        <button class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#412d15]/[.55] transition hover:bg-[#412d15]/[.08] dark:text-[#e1dcc9]/[.40] dark:hover:bg-white/[.05]" on:click={closePreview} aria-label="Close file"><X size={14} /></button>
      {:else}
        <span class="text-[9px] uppercase tracking-wider text-[#412d15]/[.40] dark:text-[#e1dcc9]/[.30]">{items.length} items</span>
      {/if}
    </div>
    {#if selectedPath}
      {#if previewLoading}
        <div class="p-8 text-center text-[11px] text-[#412d15]/[.45] dark:text-[#e1dcc9]/[.30]">Loading file…</div>
      {:else if previewError}
        <div class="p-8 text-center text-[11px] text-[#412d15]/[.60] dark:text-[#e1dcc9]/[.45]">{previewError}</div>
      {:else}
        <div class="h-[calc(100%-49px)] overflow-auto">
          <div class="flex min-w-max">
            <div class="select-none border-r border-[#1f150c]/[.08] bg-[#412d15]/[.025] px-3 py-5 text-right font-mono text-[10px] leading-5 tabular-nums text-[#412d15]/[.30] dark:border-[#e1dcc9]/[.06] dark:bg-white/[.015] dark:text-[#e1dcc9]/[.20]">
              {#each preview.split("\n") as _, index}
                <div>{index + 1}</div>
              {/each}
            </div>
            <pre class="m-0 px-5 py-5 font-mono text-[10px] leading-5 text-[#1f150c]/[.78] dark:text-[#e1dcc9]/[.58]"><code>{preview}</code></pre>
          </div>
        </div>
      {/if}
    {:else}
      {#if error}
        <div class="p-8 text-center text-[11px] text-[#412d15]/[.65] dark:text-[#e1dcc9]/[.50]">{error}</div>
      {:else if loading}
        <div class="space-y-0" aria-label="Loading workspace" aria-busy="true">
          {#each Array(8) as _}
            <div class="grid grid-cols-[1fr_120px_150px] items-center gap-4 px-5 py-3 max-[700px]:grid-cols-[1fr_90px]">
              <div class="flex min-w-0 items-center gap-3"><div class="h-4 w-4 animate-pulse rounded bg-[#1f150c]/[.07] dark:bg-white/[.06]"></div><div class="h-3 w-40 animate-pulse rounded bg-[#1f150c]/[.07] dark:bg-white/[.06]"></div></div>
              <div class="h-2.5 w-16 animate-pulse rounded bg-[#1f150c]/[.05] dark:bg-white/[.04] max-[700px]:hidden"></div>
              <div class="ml-auto h-2.5 w-24 animate-pulse rounded bg-[#1f150c]/[.05] dark:bg-white/[.04] max-[700px]:hidden"></div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="divide-y divide-[#1f150c]/[.08] dark:divide-[#e1dcc9]/[.05]">
          {#each items as item}
            <button class="grid w-full grid-cols-[1fr_120px_150px] items-center gap-4 px-5 py-3 text-left transition hover:bg-[#412d15]/[.06] dark:hover:bg-white/[.03] max-[700px]:grid-cols-[1fr_90px]" on:click={() => item.type === "directory" ? navigateTo(path === "." ? item.name : `${path}/${item.name}`) : selectFile(item.name)}>
              <span class="flex min-w-0 items-center gap-3">
                {#if item.type === "directory"}
                  <Folder size={15} class="shrink-0 text-[#412d15]/[.65] dark:text-[#e1dcc9]/[.48]" />
                {:else}
                  <File size={15} class="shrink-0 text-[#412d15]/[.42] dark:text-[#e1dcc9]/[.30]" />
                {/if}
                <span class="truncate text-[11px] font-medium text-[#1f150c]/[.78] dark:text-[#e1dcc9]/[.62]">{item.name}</span>
              </span>
              <span class="text-[10px] text-[#412d15]/[.48] dark:text-[#e1dcc9]/[.32] max-[700px]:hidden">{item.type === "directory" ? "Directory" : formatSize(item.size)}</span>
              <span class="text-right text-[10px] text-[#412d15]/[.48] dark:text-[#e1dcc9]/[.32] max-[700px]:hidden">{formatDate(item.modified)}</span>
            </button>
          {:else}
            <div class="p-10 text-center text-[11px] text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.34]">This directory is empty.</div>
          {/each}
        </div>
      {/if}
    {/if}
  </section>
</div>
