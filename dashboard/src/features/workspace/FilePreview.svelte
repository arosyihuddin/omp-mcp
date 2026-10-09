<script lang="ts">
  import { workspaceApi } from '$lib/api';
  import { Modal } from '$lib/components/ui';
  import { preview } from './preview.svelte';

  const src = $derived(workspaceApi.previewUrl(preview.path));
</script>

<Modal open={preview.open} title={preview.name} width="max-w-5xl" onclose={() => preview.hide()}>
  {#if preview.kind === 'image'}
    <div class="flex min-h-[40vh] items-center justify-center bg-canvas p-6">
      <img {src} alt={preview.name} class="max-h-[68vh] max-w-full object-contain" />
    </div>
  {:else if preview.kind === 'pdf'}
    <iframe title={preview.name} {src} class="h-[70vh] w-full border-0 bg-white"></iframe>
  {:else if preview.kind === 'video'}
    <div class="flex min-h-[40vh] items-center justify-center bg-canvas p-6">
      <video controls {src} class="max-h-[68vh] max-w-full"><track kind="captions" /></video>
    </div>
  {:else if preview.kind === 'audio'}
    <div class="flex min-h-[30vh] items-center justify-center bg-canvas p-8">
      <audio controls {src} class="w-full max-w-xl"></audio>
    </div>
  {/if}
</Modal>
