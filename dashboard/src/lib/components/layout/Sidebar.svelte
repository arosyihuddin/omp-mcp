<script lang="ts">
  import { ChevronDown, Folder, PanelLeft } from '@lucide/svelte';
  import { mainNav, routes, workspaceNav } from '$lib/routes';
  import { dashboard } from '$lib/stores/dashboard.svelte';
  import { router } from '$lib/stores/router.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import ProfileCard from './ProfileCard.svelte';
  import SidebarItem from './SidebarItem.svelte';

  let workspaceOpen = $state(false);
  const collapsed = $derived(ui.sidebarCollapsed);

  function onWorkspaceClick() {
    // In the collapsed rail there is no room for children: jump to Files.
    if (collapsed && window.matchMedia('(min-width: 768px)').matches) router.navigate('workspace-files');
    else workspaceOpen = !workspaceOpen;
  }
</script>

{#if ui.mobileNavOpen}
  <button
    type="button"
    class="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] md:hidden"
    aria-label="Close navigation"
    onclick={() => (ui.mobileNavOpen = false)}
  ></button>
{/if}

<aside
  class={[
    'fixed inset-y-0 left-0 z-40 flex w-[min(84vw,256px)] shrink-0 flex-col bg-canvas transition-transform duration-200 ease-out md:relative md:z-auto md:translate-x-0 md:transition-[width]',
    ui.mobileNavOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full',
    collapsed ? 'md:w-14' : 'md:w-56',
  ]}
>
  <div class="flex h-12 shrink-0 items-center justify-between px-3">
    {#if collapsed}
      <button
        type="button"
        class="group relative mx-auto hidden h-7 w-7 items-center justify-center overflow-hidden rounded-md md:flex"
        onclick={() => ui.toggleSidebar()}
        aria-label="Expand sidebar"
        title="Expand sidebar"
      >
        <img src="/favicon.svg" alt="" class="h-full w-full transition-opacity group-hover:opacity-0" />
        <span class="absolute inset-0 flex items-center justify-center text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100">
          <PanelLeft size={16} strokeWidth={1.8} />
        </span>
      </button>
    {/if}
    <div class={['flex min-w-0 items-center gap-2.5', collapsed && 'md:hidden']}>
      <img src="/favicon.svg" alt="" class="h-6 w-6 shrink-0 rounded" />
      <span class="truncate text-base font-semibold tracking-tight">OMP MCP</span>
    </div>
    <button
      type="button"
      class={['hidden h-7 w-7 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-surface-hover hover:text-fg', !collapsed && 'md:flex']}
      onclick={() => ui.toggleSidebar()}
      aria-label="Collapse sidebar"
      title="Collapse sidebar"
    >
      <PanelLeft size={16} strokeWidth={1.8} />
    </button>
  </div>

  <nav class="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pt-2" aria-label="Main">
    {#each mainNav as id (id)}
      {@const route = routes[id]}
      <SidebarItem
        href={route.path}
        icon={route.icon}
        label={route.title}
        active={router.current === id}
        {collapsed}
        badge={id === 'approvals' ? dashboard.pendingApprovals : 0}
        onclick={(event) => router.link(event, id)}
      />
    {/each}

    <div class="pt-1">
      <button
        type="button"
        class={[
          'flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-base transition-colors',
          collapsed && 'md:justify-center md:px-0',
          router.inWorkspace && (collapsed || !workspaceOpen) ? 'bg-surface-active text-fg' : 'text-fg-subtle hover:bg-surface-hover hover:text-fg',
        ]}
        onclick={onWorkspaceClick}
        aria-expanded={workspaceOpen}
        title={collapsed ? 'Workspace' : undefined}
      >
        <Folder size={16} strokeWidth={1.8} class="shrink-0" />
        <span class={['truncate', collapsed && 'md:hidden']}>Workspace</span>
        <ChevronDown size={13} strokeWidth={1.8} class={['ml-auto transition-transform', !workspaceOpen && '-rotate-90', collapsed && 'md:hidden']} />
      </button>
      {#if workspaceOpen}
        <div class={['ml-[17px] mt-0.5 space-y-0.5 border-l border-line pl-2', collapsed && 'md:hidden']}>
          {#each workspaceNav as id (id)}
            {@const route = routes[id]}
            <SidebarItem
              nested
              href={route.path}
              icon={route.icon}
              label={route.title}
              active={router.current === id}
              onclick={(event) => router.link(event, id)}
            />
          {/each}
        </div>
      {/if}
    </div>
  </nav>

  <div class="shrink-0 p-2">
    <ProfileCard {collapsed} />
  </div>
</aside>
