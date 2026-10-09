<script lang="ts">
  import { Meter, Panel } from '$lib/components/ui';
  import type { SystemTelemetry } from '$lib/types';
  import { EMPTY, formatGiB } from '$lib/utils/format';

  interface Props {
    system: SystemTelemetry;
  }

  let { system }: Props = $props();

  const load = $derived(system.cpu?.load_average);
  const memory = $derived(system.memory);
  const averages = $derived(
    (['1m', '5m', '15m'] as const).map((key) => ({ key, value: load?.[key]?.toFixed(2) ?? EMPTY })),
  );
</script>

<Panel title="CPU & Memory" description="Current host resource state." tag="LIVE" tagTone="success">
  <div class="space-y-5 p-4">
    <div>
      <div class="flex items-baseline justify-between text-sm">
        <span class="text-fg-muted">CPU load</span>
        <span class="font-medium text-fg">{system.cpu?.logical_cores ?? EMPTY} cores</span>
      </div>
      <div class="mt-2 grid grid-cols-3 gap-2">
        {#each averages as avg (avg.key)}
          <div class="rounded-md border border-line bg-surface px-2.5 py-2">
            <div class="text-xs text-fg-faint">{avg.key}</div>
            <div class="text-base font-medium tabular-nums text-fg">{avg.value}</div>
          </div>
        {/each}
      </div>
    </div>
    <Meter
      label="Memory"
      detail="{formatGiB(memory?.used_bytes)} / {formatGiB(memory?.total_bytes)}"
      percent={memory?.usage_percent ?? null}
    />
  </div>
</Panel>
