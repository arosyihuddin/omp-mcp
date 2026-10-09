<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte';
  import type { BadgeTone } from '$lib/components/ui/types';
  import type { RiskLevel } from '$lib/types';

  interface Props {
    risk: RiskLevel;
  }

  let { risk }: Props = $props();

  const tones: Record<RiskLevel, BadgeTone> = { low: 'success', medium: 'warning', high: 'danger', isolated: 'info' };
</script>

<Badge tone={tones[risk]} class="uppercase tracking-wide">{risk}</Badge>
