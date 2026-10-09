<script lang="ts">
  import Button from './Button.svelte';
  import Modal from './Modal.svelte';

  interface Props {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    destructive?: boolean;
    onconfirm: () => void;
    oncancel: () => void;
  }

  let { open, title, description, confirmLabel = 'Confirm', destructive = false, onconfirm, oncancel }: Props = $props();
</script>

<Modal {open} {title} width="max-w-md" onclose={oncancel}>
  <p class="px-4 py-4 text-base text-fg-muted">{description}</p>
  {#snippet footer()}
    <Button size="sm" onclick={oncancel}>Cancel</Button>
    <Button size="sm" variant={destructive ? 'danger' : 'primary'} onclick={onconfirm}>{confirmLabel}</Button>
  {/snippet}
</Modal>
