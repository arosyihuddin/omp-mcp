<script lang="ts">
  import { Home, PinOff } from '@lucide/svelte';
  import { IconButton } from '$lib/components/ui';
  import { browser } from './browser.svelte';
  import FileIcon from './FileIcon.svelte';
  import { prefs } from './preferences.svelte';
</script>

<aside class="hidden min-h-0 overflow-y-auto border-r border-line pr-3 lg:block">
  <div class="eyebrow mb-2 px-2">Places</div>
  <ul class="space-y-0.5">
    <li>
      <button
        type="button"
        class={[
          'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-base transition-colors hover:bg-surface-hover hover:text-fg',
          browser.path === '.' ? 'bg-surface-active text-fg' : 'text-fg-subtle',
        ]}
        onclick={() => browser.navigate('.')}
      >
        <Home size={14} class="shrink-0" /> Home
      </button>
    </li>
  </ul>

  <div class="eyebrow mb-2 mt-4 px-2">Pinned</div>
  {#if prefs.pins.length === 0}
    <p class="px-2 text-sm text-fg-faint">Pin a folder from its ⋮ menu.</p>
  {:else}
    <ul class="space-y-0.5">
      {#each prefs.pins as pin (pin.path)}
        <li class="group relative">
          <button
            type="button"
            class={[
              'flex h-8 w-full items-center gap-2 rounded-md px-2 pr-8 text-left text-base transition-colors hover:bg-surface-hover hover:text-fg',
              browser.path === pin.path ? 'bg-surface-active text-fg' : 'text-fg-subtle',
            ]}
            onclick={() => browser.navigate(pin.path)}
          >
            <FileIcon item={{ name: pin.name, type: 'directory' }} size={14} />
            <span class="truncate">{pin.name}</span>
          </button>
          <IconButton
            size="sm"
            label="Unpin {pin.name}"
            class="absolute right-0.5 top-1/2 -translate-y-1/2 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            onclick={() => prefs.togglePin(pin.path, pin.name)}
          >
            <PinOff size={12} />
          </IconButton>
        </li>
      {/each}
    </ul>
  {/if}
</aside>

<!-- Below `lg` the sidebar is hidden, so Home + pinned folders become a compact strip. -->
<nav aria-label="Places" class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden">
  {#each [{ path: '.', name: 'Home' }, ...prefs.pins] as place (place.path)}
    <button
      type="button"
      class={[
        'flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 text-sm transition-colors hover:bg-surface-hover hover:text-fg',
        browser.path === place.path ? 'border-line-strong bg-surface-active text-fg' : 'border-line text-fg-subtle',
      ]}
      onclick={() => browser.navigate(place.path)}
    >
      {#if place.path === '.'}<Home size={13} class="shrink-0" />{:else}<FileIcon item={{ name: place.name, type: 'directory' }} size={13} />{/if}
      {place.name}
    </button>
  {/each}
</nav>
