<script lang="ts">
  import type { LucideIcon } from '@lucide/svelte';

  interface Props {
    href: string;
    icon: LucideIcon;
    label: string;
    active?: boolean;
    /** Icon-only presentation (desktop collapsed rail). */
    collapsed?: boolean;
    nested?: boolean;
    badge?: number;
    onclick: (event: MouseEvent) => void;
  }

  let { href, icon: Icon, label, active = false, collapsed = false, nested = false, badge = 0, onclick }: Props = $props();
</script>

<a
  {href}
  {onclick}
  aria-current={active ? 'page' : undefined}
  title={collapsed ? label : undefined}
  class={[
    'flex w-full items-center rounded-md transition-colors',
    nested ? 'h-7 gap-2 px-2 text-sm' : 'h-8 gap-2.5 px-2.5 text-base',
    collapsed && 'md:justify-center md:px-0',
    active ? 'bg-surface-active text-fg' : 'text-fg-subtle hover:bg-surface-hover hover:text-fg',
  ]}
>
  <Icon size={nested ? 14 : 16} strokeWidth={1.8} class="shrink-0" />
  <span class={['truncate', collapsed && 'md:hidden']}>{label}</span>
  {#if badge > 0}
    <span class={['ml-auto rounded bg-accent/15 px-1.5 text-xs font-medium text-accent-hover', collapsed && 'md:hidden']}>{badge}</span>
  {/if}
</a>
