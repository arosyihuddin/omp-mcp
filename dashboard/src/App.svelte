<script lang="ts">
  import { onMount } from 'svelte';
  import { Activity, Folder, GitBranch, LayoutDashboard, Moon, PanelLeft, RefreshCw, ShieldCheck, Sun, Terminal, Wrench } from '@lucide/svelte';
  import Overview from './pages/Overview.svelte';
  import Tools from './pages/Tools.svelte';
  import Approvals from './pages/Approvals.svelte';
  import Sessions from './pages/Sessions.svelte';
  import Workspace from './pages/Workspace.svelte';
  import Placeholder from './pages/Placeholder.svelte';
  import type { HostTelemetry, Session, Tool } from './lib/types';
  const nav = [
    ['overview', 'Overview', LayoutDashboard],
    ['workspace', 'Workspace', Folder],
    ['tools', 'Tools', Wrench],
    ['approvals', 'Approvals', ShieldCheck],
    ['sessions', 'OMP Sessions', Activity],
    ['logs', 'Logs', Terminal],
    ['git', 'Git', GitBranch]
  ] as const;

  const routes: Record<string, string> = {
    '/': 'overview',
    '/workspace': 'workspace',
    '/tools': 'tools',
    '/approvals': 'approvals',
    '/sessions': 'sessions',
    '/logs': 'logs',
    '/git': 'git'
  };

  let active = 'overview';
  let tools: Tool[] = [];
  let sessions: Session[] = [];
  let host: HostTelemetry = {};
  let connected = false;
  let loading = true;
  let theme: 'dark' | 'light' = 'dark';
  let sidebarCollapsed = false;
  let workspacePath = '.';
  let workspaceItems: { name: string; type: 'directory' | 'file'; size: number | null; modified: string }[] = [];
  let workspaceLoading = false;
  let workspaceError = '';

  async function loadWorkspace(path = '.') {
    workspaceLoading = true;
    workspaceError = '';
    try {
      const response = await fetch(`/api/workspace?path=${encodeURIComponent(path)}`, { cache: 'no-store' });
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

  $: pageTitle = nav.find((item) => item[0] === active)?.[1] ?? 'Overview';
  $: approvalCandidates = tools.filter((tool) => tool.risk === 'medium' || tool.risk === 'high').length;

  function routeFor(view: string) {
    return view === 'overview' ? '/' : `/${view}`;
  }

  function navigate(view: string, replace = false) {
    active = view;
    const url = routeFor(view);
    if (replace) history.replaceState({}, '', url);
    else history.pushState({}, '', url);
    if (view === 'workspace') loadWorkspace(workspacePath);
  }

  function setTheme(next: 'dark' | 'light') {
    theme = next;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('omp-theme', theme);
  }

  function toggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('omp-sidebar-collapsed', String(sidebarCollapsed));
  }

  async function refresh() {
    loading = true;
    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!response.ok) throw new Error('Dashboard API unavailable');
      const data = await response.json();
      host = data.host ?? {};
      tools = data.tools ?? [];
      sessions = data.sessions ?? [];
      connected = true;
    } catch {
      connected = false;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    const savedTheme = localStorage.getItem('omp-theme');
    setTheme(savedTheme === 'light' ? 'light' : 'dark');
    navigate(routes[window.location.pathname] ?? 'overview', true);
    sidebarCollapsed = localStorage.getItem('omp-sidebar-collapsed') === 'true';
    refresh();

    const onPopState = () => {
      active = routes[window.location.pathname] ?? 'overview';
    };
    window.addEventListener('popstate', onPopState);
    const timer = window.setInterval(refresh, 10000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('popstate', onPopState);
    };
  });
</script>

<div class="h-screen overflow-hidden bg-[#e1dcc9] font-sans text-[#1f150c] selection:bg-[#412d15]/[.20] dark:bg-black dark:text-[#e1dcc9] dark:selection:bg-[#412d15]">
  <div class="flex h-screen overflow-hidden bg-[#e1dcc9] dark:bg-black">
    <aside class="relative flex h-screen shrink-0 flex-col bg-[#e1dcc9] transition-[width] duration-200 ease-out dark:bg-black {sidebarCollapsed ? 'w-16' : 'w-[248px]'}">
      <div class="flex h-20 shrink-0 items-center justify-between px-4">
        <div class="flex min-w-0 items-center gap-3 transition-opacity duration-150 {sidebarCollapsed ? 'invisible opacity-0' : ''}">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#1f150c]/[.15] bg-[#412d15]/[.08] dark:border-[#e1dcc9]/[.10] dark:bg-[#09090b]">
            <svg viewBox="0 0 64 64" class="h-full w-full" aria-hidden="true">
              <rect width="64" height="64" rx="16" fill="#412d15" />
              <path d="M18 20h28v8H27v8h15v8H27v8h19v-8h-11v-8h11V20H18Z" fill="#e1dcc9" />
              <circle cx="49" cy="15" r="4" fill="#e1dcc9" />
            </svg>
          </div>
          <div class="min-w-0">
            <div class="truncate text-[14px] font-semibold tracking-tight">OMP Control Plane</div>
            <div class="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">Local management</div>
          </div>
        </div>
        <button class="flex h-7 w-7 items-center justify-center rounded-md text-[#412d15]/[.70] transition hover:bg-[#412d15]/[.10] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.58] dark:hover:bg-[#412d15]/[.35] dark:hover:text-[#e1dcc9] {sidebarCollapsed ? 'mx-auto' : ''}" type="button" on:click={toggleSidebar} aria-label={sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'} title={sidebarCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}>
          <PanelLeft size={16} strokeWidth={1.8} />
        </button>
      </div>

      <nav class="px-3 pt-5">
        <div class="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36] {sidebarCollapsed ? 'invisible' : ''}">Control</div>
        {#each nav as item}
          {@const Icon = item[2]}
          <button
            class="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition {active === item[0]
              ? 'bg-[#412d15] text-[#e1dcc9]'
              : 'text-[#412d15]/[.70] hover:bg-[#412d15]/[.10] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.58] dark:hover:bg-[#412d15]/[.28] dark:hover:text-[#e1dcc9]'}"
            on:click={() => navigate(item[0])}
            title={sidebarCollapsed ? item[1] : undefined}
          >
            <span class="flex h-4 w-4 shrink-0 items-center justify-center"><Icon size={16} strokeWidth={1.8} /></span>
            <span class="{sidebarCollapsed ? 'hidden' : ''}">{item[1]}</span>
            {#if item[0] === 'approvals' && approvalCandidates > 0 && !sidebarCollapsed}
              <span class="ml-auto rounded-md bg-[#412d15]/[.10] px-1.5 py-0.5 text-[9px] text-[#412d15] dark:bg-[#e1dcc9]/[.10] dark:text-[#e1dcc9]">{approvalCandidates}</span>
            {/if}
          </button>
        {/each}
      </nav>

      <div class="mt-auto border-t border-[#1f150c]/[.15] p-3 dark:border-[#e1dcc9]/[.07]">
        <div class="rounded-lg border border-[#1f150c]/[.12] bg-[#412d15]/[.06] p-3 dark:border-[#e1dcc9]/[.06] dark:bg-white/[.02] {sidebarCollapsed ? 'hidden' : ''}">
          <div class="flex items-center gap-2 text-[11px] font-medium text-[#1f150c] dark:text-[#e1dcc9]">
            <span class="h-1.5 w-1.5 rounded-full {connected ? 'bg-[#412d15] shadow-[0_0_10px_rgba(65,45,21,.2)] dark:bg-[#e1dcc9] dark:shadow-[0_0_10px_rgba(225,220,201,.28)]' : 'bg-[#412d15]/[.40] dark:bg-[#e1dcc9]/[.30]'}"></span>
            {connected ? 'MCP server connected' : 'MCP server offline'}
          </div>
          <div class="mt-1 text-[10px] text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">Streamable HTTP · local</div>
        </div>
      </div>
    </aside>

    <main class="flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      <header class="sticky top-0 z-10 flex h-20 items-center justify-between bg-[#e1dcc9]/[.95] px-5 backdrop-blur-xl dark:bg-black/90">
        <div>
          <h1 class="text-[20px] font-semibold tracking-tight">{pageTitle}</h1>
          <p class="mt-1 text-[11px] text-[#412d15]/[.60] dark:text-[#e1dcc9]/[.36]">Operate and observe OMP-MCP without changing the OMP agent runtime.</p>
        </div>
        <div class="flex items-center gap-3">
          <button class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1f150c]/[.15] bg-[#412d15]/[.04] text-[#412d15]/[.75] transition hover:bg-[#412d15]/[.10] hover:text-[#1f150c] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#e1dcc9]/[.10] dark:bg-white/[.02] dark:text-[#e1dcc9]/[.58] dark:hover:bg-white/[.04] dark:hover:text-[#e1dcc9]" on:click={refresh} aria-label="Refresh" title="Refresh" disabled={loading}><RefreshCw size={15} strokeWidth={1.8} class={loading ? 'animate-spin' : ''} /></button>
          <button class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1f150c]/[.15] text-[#412d15]/[.70] transition hover:bg-[#412d15]/[.10] hover:text-[#1f150c] dark:border-[#e1dcc9]/[.10] dark:text-[#e1dcc9]/[.58] dark:hover:bg-[#412d15]/[.30] dark:hover:text-[#e1dcc9]" on:click={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {#if theme === 'dark'}<Sun size={16} strokeWidth={1.7} />{:else}<Moon size={16} strokeWidth={1.7} />{/if}
          </button>
        </div>
      </header>

      <div class="min-h-0 flex-1 rounded-tl-2xl border-l border-t border-[#1f150c]/[.15] bg-[#e1dcc9] dark:border-[#e1dcc9]/[.10] dark:bg-black">
        <div class="w-full p-5">
          {#if active === 'overview'}
            <Overview {tools} {sessions} {host} {connected} {navigate} />
          {:else if active === 'workspace'}
            <Workspace path={workspacePath} items={workspaceItems} loading={workspaceLoading} error={workspaceError} open={loadWorkspace} />
          {:else if active === 'tools'}
            <Tools {tools} />
          {:else if active === 'approvals'}
            <Approvals />
          {:else if active === 'sessions'}
            <Sessions {sessions} />
          {:else}
            <Placeholder view={active as 'workspace' | 'logs' | 'git'} />
          {/if}
        </div>
      </div>
    </main>
  </div>
</div>
