<script lang="ts">
  import type { Snippet } from 'svelte';
  import Card from './Card.svelte';

  interface Props {
    label: string;
    value?: string | number;
    hint?: string;
    /** Replaces `value` when custom markup is needed (e.g. a status dot). */
    valueSlot?: Snippet;
  }

  let { label, value, hint, valueSlot }: Props = $props();
</script>

<Card class="p-4">
  <div class="eyebrow">{label}</div>
  <div class="mt-2 text-2xl font-semibold tracking-tight text-fg">
    {#if valueSlot}{@render valueSlot()}{:else}{value}{/if}
  </div>
  {#if hint}<div class="mt-1 text-sm text-fg-subtle">{hint}</div>{/if}
</Card>
