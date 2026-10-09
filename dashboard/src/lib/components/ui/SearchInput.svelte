<script lang="ts">
  import { Search } from '@lucide/svelte';

  interface Props {
    value?: string;
    placeholder?: string;
    label?: string;
    class?: string;
  }

  let { value = $bindable(''), placeholder = 'Search…', label = 'Search', class: className }: Props = $props();
</script>

<label
  class={[
    'flex h-8 items-center gap-2 rounded-md border border-line bg-surface px-2.5 transition-colors focus-within:border-accent/60 focus-within:ring-1 focus-within:ring-accent/40 hover:border-line-strong',
    className,
  ]}
>
  <Search size={14} class="shrink-0 text-fg-faint" />
  <input
    bind:value
    {placeholder}
    aria-label={label}
    class="min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-faint focus-visible:ring-0"
  />
</label>
