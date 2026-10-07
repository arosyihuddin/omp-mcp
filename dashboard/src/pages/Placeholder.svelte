<script lang="ts">
  import { Folder, GitBranch, Terminal } from '@lucide/svelte';
  import EmptyState from '../lib/components/EmptyState.svelte';
  export let view: 'workspace' | 'logs' | 'git';
  const config = { workspace: { title: 'Workspace', icon: Folder }, logs: { title: 'Logs', icon: Terminal }, git: { title: 'Git', icon: GitBranch } } as const;
</script>
<EmptyState title={config[view].title} icon={config[view].icon} description="This control-plane module is scaffolded and intentionally does not expose an unsafe generic execution endpoint." />
