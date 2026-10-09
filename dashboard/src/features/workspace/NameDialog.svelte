<script lang="ts">
  import { Button, Input, Modal } from '$lib/components/ui';

  interface Props {
    open: boolean;
    title: string;
    label?: string;
    initial?: string;
    confirmLabel?: string;
    error?: string;
    onsubmit: (value: string) => void;
    oncancel: () => void;
  }

  let { open, title, label = 'Name', initial = '', confirmLabel = 'Create', error = '', onsubmit, oncancel }: Props = $props();

  let value = $state('');

  $effect(() => {
    if (!open) return;
    value = initial;
    setTimeout(() => {
      const input = document.getElementById('name-dialog-input') as HTMLInputElement | null;
      input?.focus();
      // Select the name without its extension, like a file manager.
      const dot = initial.lastIndexOf('.');
      input?.setSelectionRange(0, dot > 0 ? dot : initial.length);
    }, 30);
  });

  const submit = () => value.trim() && onsubmit(value.trim());
</script>

<Modal {open} {title} width="max-w-sm" onclose={oncancel}>
  <div class="space-y-2 px-4 py-4">
    <label class="block text-sm text-fg-subtle" for="name-dialog-input">{label}</label>
    <Input id="name-dialog-input" bind:value onkeydown={(event) => event.key === 'Enter' && submit()} aria-invalid={Boolean(error)} />
    {#if error}<p class="text-sm text-danger" role="alert">{error}</p>{/if}
  </div>
  {#snippet footer()}
    <Button size="sm" onclick={oncancel}>Cancel</Button>
    <Button size="sm" variant="primary" disabled={!value.trim()} onclick={submit}>{confirmLabel}</Button>
  {/snippet}
</Modal>
