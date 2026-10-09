<script lang="ts">
  import { onMount } from 'svelte';
  import AppShell from '$lib/components/layout/AppShell.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import Topbar from '$lib/components/layout/Topbar.svelte';
  import { dashboard } from '$lib/stores/dashboard.svelte';
  import { profile } from '$lib/stores/profile.svelte';
  import { router } from '$lib/stores/router.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import Overview from './pages/Overview.svelte';
  import Logs from './pages/Logs.svelte';
  import { browser } from './features/workspace/browser.svelte';
  import FavoritesView from './features/workspace/FavoritesView.svelte';
  import FilesView from './features/workspace/FilesView.svelte';
  import { prefs } from './features/workspace/preferences.svelte';
  import EditorView from './features/workspace/EditorView.svelte';
  import TerminalPage from './pages/Terminal.svelte';
  import Tools from './pages/Tools.svelte';
  import Sessions from './pages/Sessions.svelte';
  import Approvals from './pages/Approvals.svelte';



  onMount(() => {
    ui.init();
    const stopRouter = router.init();
    theme.init();
    const stopEvents = dashboard.connect();
    void dashboard.refresh();
    void prefs.init();
    void profile.load();
    return () => {
      stopRouter();
      stopEvents();
    };
  });

  // The Files view owns its listing (browser store); reload whenever it is shown.
  $effect(() => {
    if (router.current === 'workspace-files') void browser.refresh();
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
  {:else if router.current === 'workspace-files'}
    <FilesView />
  {:else if router.current === 'workspace-favorites'}
    <FavoritesView />
  {:else if router.inWorkspace}
    <EditorView />
  {/if}
</AppShell>
