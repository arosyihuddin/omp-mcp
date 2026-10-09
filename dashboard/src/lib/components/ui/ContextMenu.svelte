<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    x: number;
    y: number;
    onclose: () => void;
    children?: Snippet<[{ close: () => void }]>;
  }

  let { x, y, onclose, children }: Props = $props();

  let el = $state<HTMLDivElement>();
  let left = $state(0);
  let top = $state(0);

  // Keep the menu inside the viewport; focus it so arrow keys work.
  $effect(() => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8));
    top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    el.focus({ preventScroll: true });
  });

  // Capture scrolls from any container (they don't bubble).
  $effect(() => {
    const close = () => onclose();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  });

  function onPointerDown(event: PointerEvent) {
    if (el && !el.contains(event.target as Node)) onclose();
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onclose();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...(el?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[index === -1 && event.key === 'ArrowUp' ? items.length - 1 : next].focus();
  }
</script>

<svelte:window onpointerdown={onPointerDown} onkeydown={onKeydown} />

<div
  bind:this={el}
  role="menu"
  tabindex="-1"
  oncontextmenu={(event) => event.preventDefault()}
  class="fixed z-[70] min-w-48 max-w-72 animate-pop-in rounded-lg border border-line-strong bg-surface-raised p-1 shadow-pop outline-none"
  style:left="{left}px"
  style:top="{top}px"
>
  {@render children?.({ close: onclose })}
</div>
