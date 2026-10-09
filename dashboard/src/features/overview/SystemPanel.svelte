<script lang="ts">
  import { KeyValue, Panel } from '$lib/components/ui';
  import type { ServiceTelemetry, SystemTelemetry } from '$lib/types';
  import { EMPTY } from '$lib/utils/format';

  interface Props {
    system: SystemTelemetry;
    service: ServiceTelemetry;
  }

  let { system, service }: Props = $props();

  const os = $derived(system.os);
  const transport = $derived(
    service.transport ? service.transport + (service.httpPort ? `:${service.httpPort}` : '') : undefined,
  );
</script>

<Panel title="System" description="Operating system and service environment." tag="LIVE" tagTone="success">
  <div class="space-y-4 p-4">
    <div class="rounded-md border border-line bg-surface p-3">
      <div class="text-xs text-fg-faint">Host</div>
      <div class="mt-1 truncate text-base font-medium text-fg">{os?.hostname ?? EMPTY}</div>
      <div class="mt-0.5 truncate text-sm text-fg-subtle">{os?.pretty_name ?? os?.platform ?? EMPTY} · {os?.architecture ?? EMPTY}</div>
    </div>
    <dl class="grid grid-cols-2 gap-3">
      <KeyValue label="Kernel" value={os?.kernel} />
      <KeyValue label="Desktop" value={system.desktop?.environment} />
      <KeyValue label="Display" value={system.desktop?.display_server} />
      <KeyValue label="Transport" value={transport} />
    </dl>
  </div>
</Panel>
