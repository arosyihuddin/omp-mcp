<script lang="ts" generics="T extends string">
  import type { LucideIcon } from '@lucide/svelte';

  interface Option {
    value: T;
    label?: string;
    icon?: LucideIcon;
    /** Accessible name; required for icon-only options. */
    ariaLabel?: string;
  }

  interface Props {
    options: Option[];
    value: T;
    label: string;
    onchange?: (value: T) => void;
    class?: string;
  }

  let { options, value = $bindable(), label, onchange, class: className }: Props = $props();

  function select(next: T) {
    value = next;
    onchange?.(next);
  }
</script>

<div role="group" aria-label={label} class={['inline-flex items-center gap-0.5 rounded-md border border-line bg-surface p-0.5', className]}>
  {#each options as option (option.value)}
    {@const Icon = option.icon}
    <button
      type="button"
      aria-pressed={value === option.value}
      aria-label={option.ariaLabel ?? option.label}
      title={option.ariaLabel ?? option.label}
      onclick={() => select(option.value)}
      class={[
        'inline-flex h-6 items-center justify-center gap-1.5 rounded px-2 text-sm font-medium capitalize transition-colors',
        value === option.value ? 'bg-surface-active text-fg' : 'text-fg-subtle hover:text-fg',
        !option.label && 'w-6 px-0',
      ]}
    >
      {#if Icon}<Icon size={14} />{/if}
      {#if option.label}{option.label}{/if}
    </button>
  {/each}
</div>
