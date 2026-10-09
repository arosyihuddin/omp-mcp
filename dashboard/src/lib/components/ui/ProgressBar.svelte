<script lang="ts">
  interface Props {
    /** 0–100. `null` renders an empty bar. */
    value: number | null;
    label: string;
    class?: string;
  }

  let { value, label, class: className }: Props = $props();

  const clamped = $derived(Math.min(100, Math.max(0, value ?? 0)));
</script>

<div
  role="progressbar"
  aria-label={label}
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={value ?? undefined}
  class={['h-1.5 overflow-hidden rounded-full bg-surface-active', className]}
>
  <div class="h-full rounded-full bg-accent transition-[width] duration-300" style:width="{clamped}%"></div>
</div>
