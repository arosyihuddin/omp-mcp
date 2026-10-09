<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    sidebar: Snippet;
    header: Snippet;
    children: Snippet;
    /** Page fills the viewport and manages its own scrolling (terminal, editor). */
    fill?: boolean;
  }

  let { sidebar, header, children, fill = false }: Props = $props();
</script>

<!--
  Connected sidebar + top bar share the canvas colour; the content panel sits
  inside with a rounded top-left corner (Linear-style frame).
-->
<div class="flex h-full overflow-hidden bg-canvas text-fg">
  {@render sidebar()}
  <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
    {@render header()}
    <main class="min-h-0 flex-1 overflow-hidden rounded-tl-xl border-l border-t border-line bg-surface">
      <div class={['h-full', fill ? 'overflow-hidden p-3 sm:p-4' : 'overflow-y-auto']}>
        {#if fill}
          {@render children()}
        {:else}
          <div class="mx-auto w-full max-w-[1200px] p-4 sm:p-6">{@render children()}</div>
        {/if}
      </div>
    </main>
  </div>
</div>
