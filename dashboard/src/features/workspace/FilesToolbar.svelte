<script lang="ts">
  import { ArrowLeft, ArrowRight, Check, FilePlus, FolderPlus, Home, LayoutGrid, List, MoreVertical, Plus, type LucideIcon } from '@lucide/svelte';
  import { Button, IconButton, Menu, MenuItem, SearchInput, SegmentedControl } from '$lib/components/ui';
  import { browser } from './browser.svelte';
  import { prefs, type FileView } from './preferences.svelte';

  interface Props {
    search?: string;
    onnew: (type: 'file' | 'directory') => void;
  }

  let { search = $bindable(''), onnew }: Props = $props();

  const viewOptions: { value: FileView; icon: LucideIcon; iconClass: string; ariaLabel: string }[] = [
    { value: 'list', icon: List, iconClass: 'text-accent-hover', ariaLabel: 'List view' },
    { value: 'grid', icon: LayoutGrid, iconClass: 'text-accent-hover', ariaLabel: 'Grid view' },
  ];

  const segments = $derived(browser.path === '.' ? [] : browser.path.split('/').filter(Boolean));
</script>

<div class="flex flex-wrap items-center gap-2">
  <div class="flex min-w-0 flex-1 items-center gap-1">
    <IconButton label="Back" disabled={!browser.back.length} onclick={() => browser.goBack()}><ArrowLeft size={14} /></IconButton>
    <IconButton label="Forward" disabled={!browser.forward.length} onclick={() => browser.goForward()}><ArrowRight size={14} /></IconButton>
    <nav
      aria-label="Current folder"
      class="flex h-8 min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-md border border-line bg-surface px-1 font-mono text-xs text-fg-muted"
    >
      <button type="button" class="flex h-6 shrink-0 items-center gap-1 rounded px-1.5 hover:bg-surface-hover hover:text-fg" onclick={() => browser.navigate('.')}>
        <Home size={12} /> /home
      </button>
      {#each segments as segment, index (index)}
        <span class="text-fg-faint">/</span>
        <button
          type="button"
          class="h-6 shrink-0 rounded px-1.5 hover:bg-surface-hover hover:text-fg"
          onclick={() => browser.navigate(segments.slice(0, index + 1).join('/'))}
        >
          {segment}
        </button>
      {/each}
    </nav>
  </div>

  <div class="flex items-center gap-2">
    <Menu width="w-44">
      {#snippet trigger({ toggle, open })}
        <Button size="sm" aria-expanded={open} onclick={toggle}><Plus size={13} /> New</Button>
      {/snippet}
      {#snippet children({ close })}
        <MenuItem onclick={() => { close(); onnew('file'); }}><FilePlus size={13} /> New file</MenuItem>
        <MenuItem onclick={() => { close(); onnew('directory'); }}><FolderPlus size={13} /> New folder</MenuItem>
      {/snippet}
    </Menu>
    <SearchInput class="w-full sm:w-56" bind:value={search} placeholder="Search in folder" label="Search files" />
    <SegmentedControl label="File view" options={viewOptions} value={prefs.view} onchange={(view) => prefs.setView(view)} />
    <Menu width="w-48">
      {#snippet trigger({ toggle, open })}
        <IconButton label="View options" active={open} aria-expanded={open} onclick={toggle}><MoreVertical size={14} /></IconButton>
      {/snippet}
      {#snippet children({ close })}
        <MenuItem
          class="justify-between"
          onclick={() => {
            prefs.setShowHidden(!prefs.showHidden);
            close();
          }}
        >
          <span>Show hidden files</span>
          {#if prefs.showHidden}<Check size={13} class="text-accent-hover" />{/if}
        </MenuItem>
      {/snippet}
    </Menu>
  </div>
</div>
