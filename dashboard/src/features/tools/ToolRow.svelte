<script lang="ts">
  import { Box, SquareDashed, Workflow, Wrench } from '@lucide/svelte';
  import RiskBadge from '$lib/components/domain/RiskBadge.svelte';
  import { Switch } from '$lib/components/ui';
  import type { Tool } from '$lib/types';

  interface Props {
    tool: Tool;
    updating?: boolean;
    ontoggle: (tool: Tool) => void;
  }

  let { tool, updating = false, ontoggle }: Props = $props();

  const icons: Record<string, typeof Wrench> = { 'OMP Agent': Workflow, Computer: SquareDashed, System: Box };
  const Icon = $derived(icons[tool.group] ?? Wrench);
</script>

<div class="grid grid-cols-[32px_1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover/60 md:grid-cols-[32px_1fr_110px_auto]">
  <div class="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-fg-subtle">
    <Icon size={15} strokeWidth={1.8} />
  </div>
  <div class="min-w-0">
    <div class="flex flex-wrap items-center gap-2">
      <span class="font-mono text-sm text-fg">{tool.name}</span>
      <RiskBadge risk={tool.risk} />
    </div>
    <p class="mt-0.5 text-sm text-fg-subtle">{tool.description}</p>
  </div>
  <div class="hidden text-right text-xs uppercase tracking-wider text-fg-faint md:block">{tool.group}</div>
  <Switch
    checked={tool.exposed}
    disabled={updating}
    label={tool.exposed ? `Hide ${tool.name} from MCP clients` : `Expose ${tool.name} to MCP clients`}
    onchange={() => ontoggle(tool)}
  />
</div>
