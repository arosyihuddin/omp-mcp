<script lang="ts">
  interface Props {
    tone?: 'success' | 'warning' | 'danger' | 'muted';
    pulse?: boolean;
    class?: string;
  }

  let { tone = 'muted', pulse = false, class: className }: Props = $props();

  const tones = { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', muted: 'bg-fg-faint' };
</script>

<span class={['relative inline-flex h-1.5 w-1.5 shrink-0', className]} aria-hidden="true">
  {#if pulse}<span class={['absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', tones[tone]]}></span>{/if}
  <span class={['relative inline-flex h-1.5 w-1.5 rounded-full', tones[tone]]}></span>
</span>
