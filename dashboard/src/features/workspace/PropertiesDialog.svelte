<script lang="ts">
  import { workspaceApi, errorMessage } from '$lib/api';
  import { Button, KeyValue, Modal, Skeleton } from '$lib/components/ui';
  import type { WorkspaceStat } from '$lib/types';
  import { formatDateTime, formatSize } from '$lib/utils/format';
  import { homePath } from './actions';

  interface Props {
    /** Workspace path to inspect; `null` closes the dialog. */
    path: string | null;
    onclose: () => void;
  }

  let { path, onclose }: Props = $props();

  let info = $state<WorkspaceStat | null>(null);
  let error = $state('');

  $effect(() => {
    info = null;
    error = '';
    if (path === null) return;
    let stale = false;
    workspaceApi
      .stat(path)
      .then((data) => !stale && (info = data))
      .catch((e) => !stale && (error = errorMessage(e, 'Unable to read properties')));
    return () => (stale = true);
  });
</script>

<Modal open={path !== null} title={info?.name ?? 'Properties'} description={path === null ? '' : homePath(path)} width="max-w-md" {onclose}>
  <div class="space-y-2 px-4 py-4">
    {#if error}
      <p class="text-sm text-danger" role="alert">{error}</p>
    {:else if !info}
      <Skeleton class="h-24 rounded-md" />
    {:else}
      <KeyValue label="Type" value={info.type === 'directory' ? 'Folder' : 'File'} />
      <KeyValue label="Location" value={homePath(info.path)} />
      {#if info.type === 'file'}<KeyValue label="Size" value={formatSize(info.size)} />{:else}<KeyValue label="Items" value={String(info.children ?? 0)} />{/if}
      <KeyValue label="Created" value={formatDateTime(info.created)} />
      <KeyValue label="Modified" value={formatDateTime(info.modified)} />
      <KeyValue label="Permissions" value={info.mode} />
    {/if}
  </div>
  {#snippet footer()}
    <Button size="sm" onclick={onclose}>Close</Button>
  {/snippet}
</Modal>
