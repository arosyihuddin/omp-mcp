<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte';
  import type { BadgeTone } from '$lib/components/ui/types';

  interface Props {
    status: string;
  }

  let { status }: Props = $props();

  const tone = $derived<BadgeTone>(
    status === 'running'
      ? 'success'
      : status === 'starting'
        ? 'info'
        : status === 'error' || status === 'failed'
          ? 'danger'
          : 'neutral',
  );
</script>

<Badge {tone} class="uppercase tracking-wide">{status}</Badge>
