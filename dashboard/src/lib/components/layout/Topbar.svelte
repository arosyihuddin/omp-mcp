<script lang="ts">
  import { ChevronRight, Menu, Moon, RefreshCw, Sun } from '@lucide/svelte';
  import IconButton from '$lib/components/ui/IconButton.svelte';
  import { dashboard } from '$lib/stores/dashboard.svelte';
  import { router } from '$lib/stores/router.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { ui } from '$lib/stores/ui.svelte';
</script>

<header class="flex h-12 shrink-0 items-center justify-between gap-3 bg-canvas px-3 sm:px-4">
  <div class="flex min-w-0 items-center gap-2">
    <IconButton class="md:hidden" label="Open navigation" onclick={() => (ui.mobileNavOpen = true)}>
      <Menu size={17} strokeWidth={1.8} />
    </IconButton>
    <nav aria-label="Breadcrumb" class="flex min-w-0 items-center gap-1.5 text-md">
      {#if router.inWorkspace}
        <span class="text-fg-subtle">Workspace</span>
        <ChevronRight size={14} class="shrink-0 text-fg-faint" />
      {/if}
      <h1 class="truncate font-medium text-fg">{router.title}</h1>
    </nav>
  </div>
  <div class="flex shrink-0 items-center gap-1">
    <IconButton label="Refresh" disabled={dashboard.loading} onclick={() => dashboard.refresh()}>
      <RefreshCw size={15} strokeWidth={1.8} class={dashboard.loading ? 'animate-spin' : ''} />
    </IconButton>
    <IconButton label={theme.current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onclick={() => theme.toggle()}>
      {#if theme.current === 'dark'}<Sun size={16} strokeWidth={1.8} />{:else}<Moon size={16} strokeWidth={1.8} />{/if}
    </IconButton>
  </div>
</header>
