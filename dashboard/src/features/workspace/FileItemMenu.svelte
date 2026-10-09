<script lang="ts">
  import { MoreVertical, Pencil, Star, Trash2 } from '@lucide/svelte';
  import { IconButton, Menu, MenuItem } from '$lib/components/ui';
  import type { WorkspaceItem } from '$lib/types';
  import type { FileActions } from './actions';
  import { prefs } from './preferences.svelte';

  interface Props {
    item: WorkspaceItem;
    path: string;
    actions: FileActions;
  }

  let { item, path, actions }: Props = $props();

  const favorite = $derived(prefs.isFavorite(path));
</script>

<Menu width="w-40">
  {#snippet trigger({ toggle, open })}
    <IconButton label="Actions for {item.name}" size="sm" active={open} aria-expanded={open} onclick={toggle}>
      <MoreVertical size={14} />
    </IconButton>
  {/snippet}
  {#snippet children({ close })}
    <MenuItem
      onclick={() => {
        prefs.toggleFavorite(path, item.name, item.type);
        close();
      }}
    >
      <Star size={13} class={favorite ? 'fill-current' : ''} />
      {favorite ? 'Remove favorite' : 'Add favorite'}
    </MenuItem>
    <MenuItem
      onclick={() => {
        actions.edit(item);
        close();
      }}
    >
      <Pencil size={13} />
      {item.type === 'directory' ? 'Open folder' : 'Edit'}
    </MenuItem>
    <MenuItem
      tone="danger"
      onclick={() => {
        actions.remove(item);
        close();
      }}
    >
      <Trash2 size={13} /> Delete
    </MenuItem>
  {/snippet}
</Menu>
