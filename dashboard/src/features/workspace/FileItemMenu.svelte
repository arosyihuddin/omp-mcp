<script lang="ts">
  import { MoreVertical } from '@lucide/svelte';
  import { IconButton, Menu } from '$lib/components/ui';
  import type { WorkspaceItem } from '$lib/types';
  import type { FileActions } from './actions';
  import ItemMenuItems from './ItemMenuItems.svelte';

  interface Props {
    item: WorkspaceItem;
    path: string;
    actions: FileActions;
  }

  let { item, path, actions }: Props = $props();
</script>

<Menu width="w-56">
  {#snippet trigger({ toggle, open })}
    <IconButton label="Actions for {item.name}" size="sm" active={open} aria-expanded={open} onclick={toggle}>
      <MoreVertical size={14} />
    </IconButton>
  {/snippet}
  {#snippet children({ close })}
    <div class="max-h-[70vh] overflow-y-auto">
      <ItemMenuItems {item} {path} {actions} {close} />
    </div>
  {/snippet}
</Menu>
