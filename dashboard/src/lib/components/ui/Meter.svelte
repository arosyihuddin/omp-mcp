<script lang="ts">
  import ProgressBar from './ProgressBar.svelte';

  interface Props {
    label: string;
    detail: string;
    percent: number | null;
  }

  let { label, detail, percent }: Props = $props();
</script>

<div>
  <div class="flex items-baseline justify-between gap-3 text-sm">
    <span class="truncate text-fg-muted">{label}</span>
    <span class="shrink-0 font-medium text-fg">{detail}</span>
  </div>
  <ProgressBar class="mt-2" value={percent} {label} />
  <div class="mt-1 text-xs text-fg-faint">{percent !== null ? `${percent}%` : '—'} used</div>
</div>
