<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    children?: Snippet;
  }

  let { class: className, children, ...rest }: Props = $props();
</script>

<div class={['rounded-lg border border-line bg-surface-raised shadow-card', className]} {...rest}>
  {@render children?.()}
</div>
