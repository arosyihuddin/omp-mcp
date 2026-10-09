<script lang="ts">
  import { Moon, Pencil, Sun } from '@lucide/svelte';
  import { Avatar, Menu, MenuItem, StatusDot } from '$lib/components/ui';
  import { dashboard } from '$lib/stores/dashboard.svelte';
  import { profile } from '$lib/stores/profile.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import ProfileModal from './ProfileModal.svelte';

  interface Props {
    collapsed?: boolean;
  }

  let { collapsed = false }: Props = $props();

  let editing = $state(false);

  const name = $derived(profile.data?.displayName ?? 'Profile');
  const status = $derived(dashboard.connected ? 'MCP server connected' : 'MCP server offline');
</script>

<Menu align="left" placement="top" width="w-56">
  {#snippet trigger({ toggle, open })}
    <button
      type="button"
      title={status}
      aria-label="Profile menu: {name}, {status}"
      aria-expanded={open}
      class={[
        'flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-colors hover:bg-surface-hover',
        open ? 'border-line-strong bg-surface-hover' : 'border-line',
        collapsed && 'md:justify-center md:border-transparent md:px-0',
      ]}
      onclick={toggle}
    >
      <span class="relative shrink-0">
        <Avatar {name} color={profile.data?.avatarColor} />
        <StatusDot tone={dashboard.connected ? 'success' : 'muted'} pulse={dashboard.connected} class="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-canvas" />
      </span>
      <span class={['min-w-0', collapsed && 'md:hidden']}>
        <span class="block truncate text-sm font-medium text-fg-muted">{name}</span>
        <span class="block truncate text-xs text-fg-faint">{profile.data?.role ?? 'Administrator'}</span>
      </span>
    </button>
  {/snippet}
  {#snippet children({ close })}
    <MenuItem onclick={() => { close(); editing = true; }}><Pencil size={13} /> Edit profile</MenuItem>
    <MenuItem onclick={() => { theme.toggle(); close(); }}>
      {#if theme.current === 'dark'}<Sun size={13} /> Light theme{:else}<Moon size={13} /> Dark theme{/if}
    </MenuItem>
  {/snippet}
</Menu>

<ProfileModal open={editing} onclose={() => (editing = false)} />
