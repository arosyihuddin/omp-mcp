<script lang="ts">
  import { Meter, Panel } from '$lib/components/ui';
  import type { SystemTelemetry } from '$lib/types';
  import { EMPTY, formatGiB } from '$lib/utils/format';

  interface Props {
    system: SystemTelemetry;
  }

  let { system }: Props = $props();

  const devices = $derived(system.gpu?.devices ?? []);
  const gpu = $derived(devices[0]);
  const disk = $derived(system.disk);
</script>

<Panel title="GPU & Storage" description="Accelerator and filesystem telemetry." tag="LIVE" tagTone="success">
  <div class="space-y-5 p-4">
    {#if gpu}
      <div class="rounded-md border border-line bg-surface p-3">
        <div class="flex items-center justify-between gap-2 text-sm">
          <span class="text-fg-subtle">GPU{devices.length > 1 ? ` · ${devices.length} devices` : ''}</span>
          <span class="truncate font-medium text-fg">{gpu.name ?? 'Unknown GPU'}</span>
        </div>
        <dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-fg-subtle">
          <div>Util <span class="font-medium text-fg-muted">{gpu.utilization_gpu_percent ?? EMPTY}%</span></div>
          <div>Temp <span class="font-medium text-fg-muted">{gpu.temperature_c ?? EMPTY}°C</span></div>
          <div>VRAM <span class="font-medium text-fg-muted">{gpu.memory_used_mib ?? EMPTY} / {gpu.memory_total_mib ?? EMPTY} MiB</span></div>
          <div>Power <span class="font-medium text-fg-muted">{gpu.power_draw_w ?? EMPTY} W</span></div>
        </dl>
      </div>
    {:else}
      <div class="rounded-md border border-dashed border-line px-3 py-4 text-center text-sm text-fg-subtle">No GPU telemetry available.</div>
    {/if}
    <Meter
      label="Disk {disk?.path ?? ''}"
      detail="{formatGiB(disk?.used_bytes)} / {formatGiB(disk?.total_bytes)}"
      percent={disk?.usage_percent ?? null}
    />
  </div>
</Panel>
