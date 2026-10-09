<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    value?: string;
  }

  let { value = $bindable(''), class: className, ...rest }: Props = $props();
</script>

<input
  bind:value
  class={[
    'h-8 w-full rounded-md border border-line bg-surface px-2.5 text-base text-fg outline-none transition-colors placeholder:text-fg-faint hover:border-line-strong focus-visible:border-accent/60 focus-visible:ring-1 focus-visible:ring-accent/40',
    className,
  ]}
  {...rest}
/>
