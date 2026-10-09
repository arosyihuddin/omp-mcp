<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    value?: string | number;
    mono?: boolean;
    children?: Snippet;
  }

  let { label, value, mono = false, children }: Props = $props();
</script>

<div class="min-w-0">
  <dt class="text-xs text-fg-faint">{label}</dt>
  <dd class={['mt-0.5 break-words text-sm text-fg-muted', mono && 'font-mono text-xs']}>
    {#if children}{@render children()}{:else}{value ?? '—'}{/if}
  </dd>
</div>
