<script lang="ts">
  import { onMount } from 'svelte';
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';
  import { dashboard } from '$lib/stores/dashboard.svelte';
  import { router } from '$lib/stores/router.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import Overview from './pages/Overview.svelte';
  import Logs from './pages/Logs.svelte';
  import Workspace from './pages/Workspace.svelte';
  import TerminalPage from './pages/Terminal.svelte';
  import Tools from './pages/Tools.svelte';
  import Sessions from './pages/Sessions.svelte';
  import Approvals from './pages/Approvals.svelte';

  type WorkspaceItem = {
    name: string;
    type: 'directory' | 'file';
    size: number | null;
    modified: string;
  };

  let workspacePath = $state('.');
  let workspaceItems = $state<WorkspaceItem[]>([]);
  let workspaceLoading = $state(false);
  let workspaceError = $state('');

  async function loadWorkspace(path = '.') {
    workspaceLoading = true;
    workspaceError = '';
    try {
      const response = await fetch('/api/workspace?path=' + encodeURIComponent(path), { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Workspace unavailable');
      workspacePath = data.path;
      workspaceItems = data.items ?? [];
    } catch (error) {
      workspaceError = error instanceof Error ? error.message : 'Unable to read workspace';
    } finally {
      workspaceLoading = false;
    }
  }

  function navigateWorkspace(mode: 'favorites' | 'files' | 'editor') {
    router.navigate(('workspace-' + mode) as 'workspace-favorites' | 'workspace-files' | 'workspace-editor');
    ui.mobileNavOpen = false;
    if (mode === 'files') void loadWorkspace(workspacePath);
  }

  onMount(() => {
    ui.init();
    const stopRouter = router.init();
    theme.init();
    const stopEvents = dashboard.connect();
    void dashboard.refresh();
    if (router.current === 'workspace-files') void loadWorkspace(workspacePath);
    return () => {
      stopRouter();
      stopEvents();
    };
  });

  $effect(() => {
    if (router.current === 'workspace-files') void loadWorkspace(workspacePath);
  });
</script>

{#snippet sidebar()}
  <Sidebar />
{/snippet}

{#snippet header()}
  <Topbar />
{/snippet}

<AppShell
  fill={router.current === 'terminal' || router.current === 'workspace-files' || router.current === 'workspace-editor'}
  {sidebar}
  {header}
>
  {#if router.current === 'overview'}
    <Overview />
  {:else if router.current === 'tools'}
    <Tools />
  {:else if router.current === 'approvals'}
    <Approvals />
  {:else if router.current === 'sessions'}
    <Sessions />
  {:else if router.current === 'terminal'}
    <TerminalPage />
  {:else if router.current === 'logs'}
    <Logs />
  {:else if router.inWorkspace}
    <Workspace
      mode={router.current === 'workspace-favorites' ? 'favorites' : router.current === 'workspace-editor' ? 'editor' : 'files'}
      path={workspacePath}
      items={workspaceItems}
      loading={workspaceLoading}
      error={workspaceError}
      open={loadWorkspace}
      navigatePage={navigateWorkspace}
    />
  {/if}
</AppShell>
