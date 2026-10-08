<script lang="ts">
  import { onMount } from 'svelte';
  import { Activity, Folder, LayoutDashboard, Menu, Moon, PanelLeft, RefreshCw, ScrollText, ShieldCheck, Sun, Terminal as TerminalIcon, Wrench } from '@lucide/svelte';
  import Overview from './pages/Overview.svelte';
  import Tools from './pages/Tools.svelte';
  import Approvals from './pages/Approvals.svelte';
  import Sessions from './pages/Sessions.svelte';
  import Workspace from './pages/Workspace.svelte';
  import TerminalPage from './pages/Terminal.svelte';
  import Logs from './pages/Logs.svelte';
  import type { HostTelemetry, Session, Tool } from './lib/types';
  const nav = [
    ['overview', 'Overview', LayoutDashboard],
    ['workspace', 'Workspace', Folder],
    ['tools', 'Tools', Wrench],
    ['approvals', 'Approvals', ShieldCheck],
    ['sessions', 'OMP Sessions', Activity],
    ['terminal', 'Terminal', TerminalIcon],
    ['logs', 'Logs', ScrollText]
  ] as const;

  const routes: Record<string, string> = {
    '/': 'overview',
    '/workspace': 'workspace',
    '/tools': 'tools',
    '/approvals': 'approvals',
    '/sessions': 'sessions',
    '/terminal': 'terminal',
    '/logs': 'logs'
  };

  let active = 'overview';
  let tools: Tool[] = [];
  let toolCount = 0;
  let toolRiskCounts: Record<string, number> = {};
  let sessions: Session[] = [];
  let host: HostTelemetry = {};
  let connected = false;
  let loading = true;
  let theme: 'dark' | 'light' = 'dark';
  let sidebarCollapsed = false;
  let mobileMenuOpen = false;
  let workspacePath = '.';
  let workspaceItems: { name: string; type: 'directory' | 'file'; size: number | null; modified: string }[] = [];
  let workspaceLoading = false;
  let workspaceError = '';
  let approvalCandidates = 0;

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

  function routeFor(view: string) {
    return view === 'overview' ? '/' : `/${view}`;
  }

  function navigate(view: string, replace = false) {
    active = view;
    mobileMenuOpen = false;
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

  async function loadTools() {
    try {
      const response = await fetch('/api/tools', { cache: 'no-store' });
      if (!response.ok) throw new Error('Tools API unavailable');
      const data = await response.json();
      tools = data.tools ?? [];
    } catch {}
  }

  async function updateToolExposure(tool: Tool, exposed: boolean) {
    const response = await fetch(`/api/tools/${encodeURIComponent(tool.name)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ exposed }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Unable to update tool exposure');
    tools = tools.map((item) => item.name === tool.name ? data.tool : item);
  }

  async function refresh() {
    loading = true;
    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!response.ok) throw new Error('Dashboard API unavailable');
      const data = await response.json();
      host = data.host ?? {};
      toolCount = data.toolCount ?? 0;
      toolRiskCounts = data.toolRiskCounts ?? {};
      sessions = data.sessions ?? [];
      approvalCandidates = data.approvalCount ?? 0;
      connected = true;
    } catch {
      connected = false;
    } finally {
      loading = false;
    }
  }
  function applyApprovalEvent(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data) as { approvals?: { status?: string }[]; status?: string };
      if (event.type === 'dashboard.snapshot') {
        approvalCandidates = (data.approvals ?? []).filter((approval) => approval.status === 'pending').length;
      } else if (event.type === 'approval.created') {
        approvalCandidates += 1;
      } else if (event.type === 'approval.updated' && data.status !== 'pending') {
        approvalCandidates = Math.max(0, approvalCandidates - 1);
      } else if (event.type === 'approval.cleared') {
        approvalCandidates = 0;
      }
    } catch {}
  }
  function applySessionEvent(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data) as Session | { sessionId?: string };
      if (event.type === 'dashboard.snapshot') {
        const snapshot = data as unknown as { sessions?: Session[] };
        sessions = snapshot.sessions ?? sessions;
      } else if (event.type === 'session.created' || event.type === 'session.updated') {
        const session = data as Session;
        const index = sessions.findIndex((item) => item.sessionId === session.sessionId);
        sessions = index >= 0
          ? sessions.map((item, i) => i === index ? session : item)
          : [session, ...sessions];
      } else if (event.type === 'session.removed' && data.sessionId) {
        sessions = sessions.filter((item) => item.sessionId !== data.sessionId);
      }
    } catch {}
  }
  function applyTelemetryEvent(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data) as { system?: Record<string, unknown>; service?: Record<string, unknown> };
      host = { ...host, system: data.system ?? host.system, service: data.service ?? host.service };
      connected = true;
    } catch {}
  }


 onMount(() => {
   const savedTheme = localStorage.getItem('omp-theme');
   setTheme(savedTheme === 'light' ? 'light' : 'dark');
   navigate(routes[window.location.pathname] ?? 'overview', true);
   sidebarCollapsed = localStorage.getItem('omp-sidebar-collapsed') === 'true';
   refresh();
   if (routes[window.location.pathname] === 'tools') loadTools();

   const onPopState = () => {
     active = routes[window.location.pathname] ?? 'overview';
     if (active === 'tools') loadTools();
   };
   window.addEventListener('popstate', onPopState);
  const events = new EventSource('/api/events');
  events.addEventListener('telemetry.updated', applyTelemetryEvent);
   events.addEventListener('dashboard.snapshot', applyApprovalEvent);
  events.addEventListener('dashboard.snapshot', applySessionEvent);
   events.addEventListener('approval.created', applyApprovalEvent);
   events.addEventListener('approval.updated', applyApprovalEvent);
   events.addEventListener('approval.cleared', applyApprovalEvent);
  events.addEventListener('session.created', applySessionEvent);
  events.addEventListener('session.updated', applySessionEvent);
  events.addEventListener('session.removed', applySessionEvent);
   return () => {
    events.close();
     window.removeEventListener('popstate', onPopState);
   };
 });
</script>

<div class="h-screen overflow-hidden bg-[#e1dcc9] font-sans text-[#1f150c] selection:bg-[#412d15]/[.20] dark:bg-black dark:text-[#e1dcc9] dark:selection:bg-[#412d15]">
  <div class="flex h-screen overflow-hidden bg-[#e1dcc9] dark:bg-black">
    {#if mobileMenuOpen}
      <button type="button" class="fixed inset-0 z-30 bg-black/[.45] backdrop-blur-[1px] md:hidden" aria-label="Close navigation" on:click={() => mobileMenuOpen = false}></button>
    {/if}
    <aside class="fixed inset-y-0 left-0 z-40 flex h-screen w-[min(84vw,280px)] shrink-0 flex-col bg-[#e1dcc9] shadow-[18px_0_50px_rgba(31,21,12,.12)] transition-transform duration-200 ease-out dark:bg-black dark:shadow-[18px_0_50px_rgba(0,0,0,.35)] md:relative md:z-auto md:shadow-none md:transition-[width] md:duration-200 md:ease-out {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 {sidebarCollapsed ? 'md:w-16' : 'md:w-[248px]'}">
      <div class="group relative flex h-20 shrink-0 items-center justify-between px-4">
        <div class="flex min-w-0 items-center gap-3 transition-opacity duration-150 {sidebarCollapsed ? 'mx-auto w-8' : ''}">
          {#if sidebarCollapsed}
            <button
              class="group/logo relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#1f150c]/[.15] bg-[#412d15]/[.08] transition dark:border-[#e1dcc9]/[.10] dark:bg-[#09090b]"
              type="button"
              on:click={toggleSidebar}
              aria-label="Buka sidebar"
              title="Buka sidebar"
            >
              <img src="/favicon.svg" alt="" class="h-full w-full transition-opacity duration-150 group-hover/logo:opacity-0" />
              <span class="absolute inset-0 flex items-center justify-center text-[#412d15]/[.70] opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100 dark:text-[#e1dcc9]/[.58]">
                <PanelLeft size={16} strokeWidth={1.8} />
              </span>
            </button>
          {:else}
            <div class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#1f150c]/[.15] bg-[#412d15]/[.08] dark:border-[#e1dcc9]/[.10] dark:bg-[#09090b]">
              <img src="/favicon.svg" alt="" class="h-full w-full" />
            </div>
          {/if}
          <div class="min-w-0 {sidebarCollapsed ? 'hidden' : ''}">
            <div class="truncate text-[13px] font-semibold tracking-[-.01em]">OMP MCP CPanel</div>
            <div class="mt-0.5 text-[9px] text-[#412d15]/[.45] dark:text-[#e1dcc9]/[.30]">Control Panel</div>
          </div>
        </div>
        <button class="flex h-4 w-4 items-center justify-center rounded-md text-[#412d15]/[.70] transition hover:bg-[#412d15]/[.10] hover:text-[#1f150c] dark:text-[#e1dcc9]/[.58] dark:hover:bg-[#412d15]/[.35] dark:hover:text-[#e1dcc9] {sidebarCollapsed ? 'hidden' : ''}" type="button" on:click={toggleSidebar} aria-label="Tutup sidebar" title="Tutup sidebar">
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

      <div class="mt-auto border-t border-[#1f150c]/[.15] p-3 dark:border-[#e1dcc9]/[.18]">
        <div class="rounded-lg border border-[#1f150c]/[.12] bg-[#412d15]/[.06] p-3 dark:border-[#e1dcc9]/[.18] dark:bg-white/[.02] {sidebarCollapsed ? 'hidden' : ''}">
          <div class="flex items-center gap-2 text-[11px] font-medium text-[#1f150c] dark:text-[#e1dcc9]">
            <span class="h-1.5 w-1.5 rounded-full {connected ? 'bg-[#412d15] shadow-[0_0_10px_rgba(65,45,21,.2)] dark:bg-[#e1dcc9] dark:shadow-[0_0_10px_rgba(225,220,201,.28)]' : 'bg-[#412d15]/[.40] dark:bg-[#e1dcc9]/[.30]'}"></span>
            {connected ? 'MCP server connected' : 'MCP server offline'}
          </div>
          <div class="mt-1 text-[10px] text-[#412d15]/[.50] dark:text-[#e1dcc9]/[.36]">Streamable HTTP · local</div>
        </div>
      </div>
    </aside>

    <main class="flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

      <header class="flex h-16 shrink-0 items-center justify-between gap-3 bg-[#e1dcc9]/[.95] px-3 backdrop-blur-xl dark:bg-black/90 sm:h-20 sm:px-5">
        <div class="flex min-w-0 items-center gap-2">
          <button type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1f150c]/[.15] bg-[#412d15]/[.04] text-[#412d15]/[.75] transition hover:bg-[#412d15]/[.10] dark:border-[#e1dcc9]/[.10] dark:bg-white/[.02] dark:text-[#e1dcc9]/[.58] dark:hover:bg-white/[.04] md:hidden" on:click={() => mobileMenuOpen = true} aria-label="Open navigation">
            <Menu size={17} strokeWidth={1.8} />
          </button>
          <div class="min-w-0">
            <h1 class="truncate text-[17px] font-semibold tracking-tight sm:text-[20px]">{pageTitle}</h1>
            <p class="mt-1 hidden text-[11px] text-[#412d15]/[.60] dark:text-[#e1dcc9]/[.36] sm:block">Operate and observe OMP-MCP without changing the OMP agent runtime.</p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <button class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1f150c]/[.15] bg-[#412d15]/[.04] text-[#412d15]/[.75] transition hover:bg-[#412d15]/[.10] hover:text-[#1f150c] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#e1dcc9]/[.10] dark:bg-white/[.02] dark:text-[#e1dcc9]/[.58] dark:hover:bg-white/[.04] dark:hover:text-[#e1dcc9]" on:click={refresh} aria-label="Refresh" title="Refresh" disabled={loading}><RefreshCw size={15} strokeWidth={1.8} class={loading ? 'animate-spin' : ''} /></button>
          <button class="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1f150c]/[.15] text-[#412d15]/[.70] transition hover:bg-[#412d15]/[.10] hover:text-[#1f150c] dark:border-[#e1dcc9]/[.10] dark:text-[#e1dcc9]/[.58] dark:hover:bg-[#412d15]/[.30] dark:hover:text-[#e1dcc9]" on:click={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {#if theme === 'dark'}<Sun size={16} strokeWidth={1.7} />{:else}<Moon size={16} strokeWidth={1.7} />{/if}
          </button>
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-hidden rounded-tl-xl border-l-[1.5px] border-t-[1.5px] border-[#1f150c]/[.15] bg-[#e1dcc9] dark:border-[#e1dcc9]/[.18] dark:bg-black sm:rounded-tl-2xl">
        <div class="h-full min-h-0 w-full {active === 'terminal' ? 'overflow-hidden p-3 sm:p-5' : 'overflow-y-auto p-3 sm:p-5'}">

          {#if active === 'overview'}
            <Overview {sessions} {host} {connected} {navigate} {loading} {toolCount} toolRiskCounts={toolRiskCounts} approvalCount={approvalCandidates} />
          {:else if active === 'workspace'}
            <Workspace path={workspacePath} items={workspaceItems} loading={workspaceLoading} error={workspaceError} open={loadWorkspace} />
          {:else if active === 'tools'}
            <Tools {tools} {loading} updateExposure={updateToolExposure} />
          {:else if active === 'approvals'}
            <Approvals />
          {:else if active === 'sessions'}
            <Sessions {sessions} {loading} />
          {:else if active === 'terminal'}
            <div class="h-full min-h-0">
              <TerminalPage />
            </div>
          {:else if active === 'logs'}
            <Logs />
          {/if}
        </div>
      </div>
    </main>
  </div>
</div>
