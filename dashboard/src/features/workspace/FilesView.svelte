<script lang="ts">
  import { ConfirmDialog, Skeleton } from '$lib/components/ui';
  import type { WorkspaceItem } from '$lib/types';
  import { openInEditor, openPath, type FileActions } from './actions';
  import { browser } from './browser.svelte';
  import FileGrid from './FileGrid.svelte';
  import FileList from './FileList.svelte';
  import FilesSidebar from './FilesSidebar.svelte';
  import FilesToolbar from './FilesToolbar.svelte';
  import { isHidden } from './file-utils';
  import { prefs } from './preferences.svelte';

  let search = $state('');
  let deleteTarget = $state<WorkspaceItem | null>(null);

  const visible = $derived.by(() => {
    const query = search.trim().toLowerCase();
    return browser.items
      .filter((item) => (prefs.showHidden || !isHidden(item.name)) && item.name.toLowerCase().includes(query))
      .toSorted((a, b) => (a.type === b.type ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) : a.type === 'directory' ? -1 : 1));
  });

  const actions: FileActions = {
    open: (item) => openPath(browser.child(item.name), item.name, item.type),
    edit: (item) =>
      item.type === 'directory' ? void browser.navigate(browser.child(item.name)) : openInEditor(browser.child(item.name), item.name),
    remove: (item) => (deleteTarget = item),
  };

  const emptyText = $derived(search ? 'No matching files.' : 'This folder is empty.');

  async function confirmDelete() {
    const item = deleteTarget;
    deleteTarget = null;
    if (item) await browser.remove(item);
  }
</script>

<div class="grid h-full min-h-0 gap-4 lg:grid-cols-[200px_1fr]">
  <FilesSidebar />
  <div class="flex min-h-0 min-w-0 flex-col gap-3">
    <FilesToolbar bind:search />
    {#if browser.error}
      <p class="rounded-md border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{browser.error}</p>
    {/if}
    <div class="min-h-0 flex-1 overflow-y-auto">
      {#if browser.loading && browser.items.length === 0}
        <div class="space-y-1.5" aria-busy="true" aria-label="Loading files">
          {#each Array(8) as _, index (index)}<Skeleton class="h-9 rounded-md" />{/each}
        </div>
      {:else if prefs.view === 'list'}
        <FileList items={visible} basePath={browser.path} {actions} {emptyText} />
      {:else}
        <FileGrid items={visible} basePath={browser.path} {actions} {emptyText} />
      {/if}
    </div>
  </div>
</div>

<ConfirmDialog
  open={deleteTarget !== null}
  title="Delete {deleteTarget?.type === 'directory' ? 'folder' : 'file'}?"
  description="“{deleteTarget?.name}” will be permanently deleted. This cannot be undone."
  confirmLabel="Delete"
  destructive
  onconfirm={confirmDelete}
  oncancel={() => (deleteTarget = null)}
/>
