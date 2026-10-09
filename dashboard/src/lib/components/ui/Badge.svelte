<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { BadgeTone } from './types';

  interface Props {
    tone?: BadgeTone;
    class?: string;
    children?: Snippet;
  }

  let { tone = 'neutral', class: className, children }: Props = $props();

  const tones: Record<BadgeTone, string> = {
    neutral: 'bg-surface-active text-fg-subtle',
    accent: 'bg-accent/15 text-accent-hover',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
  };
</script>

<span class={['inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium leading-4', tones[tone], className]}>
  {@render children?.()}
</span>
