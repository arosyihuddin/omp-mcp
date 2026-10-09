<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open?: boolean;
    align?: 'left' | 'right';
    /** Open below (default) or above the trigger. */
    placement?: 'bottom' | 'top';
    width?: string;
    /** Receives the current open state and a toggle function. */
    trigger: Snippet<[{ open: boolean; toggle: () => void }]>;
    children?: Snippet<[{ close: () => void }]>;
  }

  let { open = $bindable(false), align = 'right', placement = 'bottom', width = 'w-44', trigger, children }: Props = $props();

  let root = $state<HTMLDivElement>();

  const toggle = () => (open = !open);
  const close = () => (open = false);

  function onPointerDown(event: PointerEvent) {
    if (open && root && !root.contains(event.target as Node)) close();
  }
  function onKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') close();
  }
</script>

<svelte:window onpointerdown={onPointerDown} onkeydown={onKeydown} />

<div bind:this={root} class="relative">
  {@render trigger({ open, toggle })}
  {#if open}
    <div
      role="menu"
      class={[
        'absolute z-30 animate-pop-in rounded-lg border border-line-strong bg-surface-raised p-1 shadow-pop',
        placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
        align === 'right' ? 'right-0' : 'left-0',
        width,
      ]}
    >
      {@render children?.({ close })}
    </div>
  {/if}
</div>
