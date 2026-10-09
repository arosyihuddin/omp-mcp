<script lang="ts">
  import { File, Folder, Image as ImageIcon } from '@lucide/svelte';
  import type { WorkspaceItem } from '$lib/types';
  import { isHidden, isPreviewable } from './file-utils';

  interface Props {
    item: Pick<WorkspaceItem, 'name' | 'type'>;
    size?: number;
  }

  let { item, size = 15 }: Props = $props();
  const dim = $derived(isHidden(item.name) && 'opacity-60');
</script>

{#if item.type === 'directory'}
  <Folder {size} strokeWidth={1.8} class={['shrink-0 text-accent-hover', dim]} />
{:else if isPreviewable(item.name)}
  <ImageIcon {size} strokeWidth={1.8} class={['shrink-0 text-fg-subtle', dim]} />
{:else}
  <File {size} strokeWidth={1.8} class={['shrink-0 text-fg-faint', dim]} />
{/if}
