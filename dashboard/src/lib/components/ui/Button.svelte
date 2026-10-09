<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
  type Size = 'sm' | 'md';

  interface Props extends HTMLButtonAttributes {
    variant?: Variant;
    size?: Size;
    /** When set, renders an anchor styled as a button. */
    href?: string;
    target?: string;
    rel?: string;
    children?: Snippet;
  }

  let { variant = 'secondary', size = 'md', type = 'button', href, class: className, children, ...rest }: Props = $props();

  const variants: Record<Variant, string> = {
    primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
    secondary: 'border border-line bg-surface-raised text-fg-muted hover:bg-surface-hover hover:text-fg',
    ghost: 'text-fg-subtle hover:bg-surface-hover hover:text-fg',
    danger: 'border border-danger/30 text-danger hover:bg-danger/10',
  };
  const sizes: Record<Size, string> = {
    sm: 'h-7 gap-1.5 px-2.5 text-sm',
    md: 'h-8 gap-1.5 px-3 text-base',
  };
</script>

<svelte:element
  this={href ? 'a' : 'button'}
  type={href ? undefined : type}
  {href}
  class={[
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  ]}
  {...rest}
>
  {@render children?.()}
</svelte:element>
