<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    /** Accessible name — also used as the native tooltip. */
    label: string;
    size?: 'sm' | 'md';
    variant?: 'ghost' | 'outline';
    active?: boolean;
    children?: Snippet;
  }

  let { label, size = 'md', variant = 'ghost', active = false, type = 'button', class: className, children, ...rest }: Props = $props();

  const variants = {
    ghost: 'text-fg-subtle hover:bg-surface-hover hover:text-fg',
    outline: 'border border-line text-fg-subtle hover:bg-surface-hover hover:text-fg',
  };
</script>

<button
  {type}
  aria-label={label}
  title={label}
  class={[
    'inline-flex shrink-0 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-40',
    size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
    active ? 'bg-surface-active text-fg' : variants[variant],
    className,
  ]}
  {...rest}
>
  {@render children?.()}
</button>
