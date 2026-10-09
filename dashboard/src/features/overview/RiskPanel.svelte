<script lang="ts">
  import { Panel, ProgressBar } from '$lib/components/ui';
  import type { RiskLevel } from '$lib/types';

  interface Props {
    counts: Partial<Record<RiskLevel, number>>;
    total: number;
  }

  let { counts, total }: Props = $props();

  const levels: RiskLevel[] = ['low', 'medium', 'high', 'isolated'];
</script>

<Panel title="Risk distribution" description="Based on current tool annotations.">
  <div class="space-y-4 p-4">
    {#each levels as level (level)}
      {@const count = counts[level] ?? 0}
      <div>
        <div class="mb-1.5 flex justify-between text-sm">
          <span class="capitalize text-fg-muted">{level}</span>
          <span class="tabular-nums text-fg-subtle">{count}</span>
        </div>
        <ProgressBar label="{level} risk tools" value={total ? Math.max(3, (count / total) * 100) : 0} />
      </div>
    {/each}
  </div>
</Panel>
