<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    tone?: 'default' | 'danger';
    children?: Snippet;
  }

  let { tone = 'default', class: className, children, ...rest }: Props = $props();
</script>

<button
  type="button"
  role="menuitem"
  class={[
    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-base transition-colors',
    tone === 'danger' ? 'text-danger hover:bg-danger/10' : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
    className,
  ]}
  {...rest}
>
  {@render children?.()}
</button>
