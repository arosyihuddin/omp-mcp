<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Inbox, type LucideIcon } from '@lucide/svelte';

  interface Props {
    title: string;
    description?: string;
    icon?: LucideIcon;
    class?: string;
    children?: Snippet;
  }

  let { title, description, icon: Icon = Inbox, class: className, children }: Props = $props();
</script>

<div class={['flex flex-col items-center justify-center px-8 py-14 text-center', className]}>
  <div class="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-fg-subtle">
    <Icon size={18} strokeWidth={1.8} />
  </div>
  <h3 class="mt-3 text-base font-medium text-fg">{title}</h3>
  {#if description}<p class="mt-1 max-w-sm text-sm text-fg-subtle">{description}</p>{/if}
  {#if children}<div class="mt-4">{@render children()}</div>{/if}
</div>
