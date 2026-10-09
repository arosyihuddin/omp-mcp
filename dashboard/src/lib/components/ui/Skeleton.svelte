<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();
</script>

<div class={['animate-pulse rounded bg-surface-active/70', className]} aria-hidden="true"></div>
