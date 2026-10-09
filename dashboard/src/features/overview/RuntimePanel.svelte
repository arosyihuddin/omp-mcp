<script lang="ts">
  import { Badge, Panel } from '$lib/components/ui';
  import type { SystemTelemetry } from '$lib/types';

  interface Props {
    system: SystemTelemetry;
  }

  let { system }: Props = $props();

  const runtimes = $derived(Object.entries(system.runtime ?? {}));
  const interfaces = $derived(system.network?.interfaces ?? []);
</script>

<Panel title="Runtime & Network" description="Detected runtimes and active network interfaces." tag="LIVE" tagTone="success">
  <div class="grid gap-5 p-4 sm:grid-cols-2">
    <dl class="space-y-2">
      {#each runtimes as [name, version] (name)}
        <div class="flex items-center justify-between gap-3 text-sm">
          <dt class="text-xs font-medium uppercase tracking-wider text-fg-faint">{name}</dt>
          <dd class="truncate font-medium text-fg-muted">{version ?? 'not installed'}</dd>
        </div>
      {:else}
        <p class="text-sm text-fg-subtle">No runtimes detected.</p>
      {/each}
    </dl>
    <ul class="space-y-2">
      {#each interfaces as network (network.name)}
        <li class="rounded-md border border-line bg-surface px-2.5 py-2">
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-fg-muted">{network.name}</span>
            <Badge tone={network.up ? 'success' : 'neutral'}>{network.up ? 'up' : 'down'}</Badge>
          </div>
          <div class="mt-1 text-xs text-fg-faint">{network.address_count} addresses · {(network.families ?? []).join(', ') || '—'}</div>
        </li>
      {/each}
    </ul>
  </div>
</Panel>
