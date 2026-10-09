<script lang="ts">
  import { Home } from '@lucide/svelte';
  import { openPath } from './actions';
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
    {#each prefs.favorites as favorite (favorite.path)}
      <li>
        <button
          type="button"
          class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-base text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
          onclick={() => openPath(favorite.path, favorite.name, favorite.type ?? 'directory')}
        >
          <FileIcon item={{ name: favorite.name, type: favorite.type ?? 'directory' }} size={14} />
          <span class="truncate">{favorite.name}</span>
        </button>
      </li>
    {/each}
  </ul>
</aside>
