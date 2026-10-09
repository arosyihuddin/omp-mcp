<script lang="ts">
  import type { Snippet } from 'svelte';
  import Badge from './Badge.svelte';
  import type { BadgeTone } from './types';

  interface Props {
    title: string;
    description?: string;
    tag?: string;
    tagTone?: BadgeTone;
    /** Rendered before the title (e.g. a back button). */
    leading?: Snippet;
    /** Rendered at the right end of the header. */
    actions?: Snippet;
    class?: string;
    children?: Snippet;
  }

  let { title, description, tag, tagTone = 'neutral', leading, actions, class: className, children }: Props = $props();
</script>

<section class={['flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-surface-raised shadow-card', className]}>
  <header class="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2.5">
    <div class="flex min-w-0 items-center gap-2">
      {@render leading?.()}
      <div class="min-w-0">
        <h2 class="truncate text-base font-medium text-fg">{title}</h2>
        {#if description}<p class="truncate text-sm text-fg-subtle">{description}</p>{/if}
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-1.5">
      {#if tag}<Badge tone={tagTone}>{tag}</Badge>{/if}
      {@render actions?.()}
    </div>
  </header>
  <div class="min-h-0 flex-1 overflow-y-auto">
    {@render children?.()}
  </div>
</section>
