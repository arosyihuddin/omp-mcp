<script lang="ts">
  import { Home, Star } from '@lucide/svelte';
  import { Button, Card, EmptyState, IconButton } from '$lib/components/ui';
  import { router } from '$lib/stores/router.svelte';
  import { openPath } from './actions';
  import FileIcon from './FileIcon.svelte';
  import { displayPath } from './file-utils';
  import { prefs } from './preferences.svelte';
</script>

<div class="space-y-8">
  <section>
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 class="text-md font-medium text-fg">Favorites</h2>
        <p class="mt-0.5 text-sm text-fg-subtle">Quick access to files and folders.</p>
      </div>
      <Button variant="primary" size="sm" onclick={() => router.navigate('workspace-files')}>Browse files</Button>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <button
        type="button"
        class="flex items-center gap-3 rounded-lg border border-line bg-surface-raised p-3.5 text-left transition-colors hover:bg-surface-hover"
        onclick={() => openPath('.', 'Home', 'directory')}
      >
        <Home size={17} class="shrink-0 text-accent-hover" />
        <span class="min-w-0">
          <span class="block text-base font-medium text-fg">Home</span>
          <span class="block truncate font-mono text-xs text-fg-faint">/home</span>
        </span>
      </button>

      {#each prefs.favorites as favorite (favorite.path)}
        <div class="group relative">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg border border-line bg-surface-raised p-3.5 pr-11 text-left transition-colors hover:bg-surface-hover"
            onclick={() => openPath(favorite.path, favorite.name, favorite.type ?? 'directory')}
          >
            <FileIcon item={{ name: favorite.name, type: favorite.type ?? 'directory' }} size={17} />
            <span class="min-w-0">
              <span class="block truncate text-base font-medium text-fg">{favorite.name}</span>
              <span class="block truncate font-mono text-xs text-fg-faint">{displayPath(favorite.path)}</span>
            </span>
          </button>
          <IconButton
            size="sm"
            label="Remove {favorite.name} from favorites"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-warning"
            onclick={() => prefs.toggleFavorite(favorite.path)}
          >
            <Star size={13} class="fill-current" />
          </IconButton>
        </div>
      {/each}
    </div>

    {#if prefs.favorites.length === 0}
      <Card class="mt-3">
        <EmptyState icon={Star} title="No favorites yet" description="Star a file or folder in the Files view to pin it here." class="py-8" />
      </Card>
    {/if}
  </section>

  {#if prefs.recents.length}
    <section>
      <div class="eyebrow mb-3">Recent</div>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {#each prefs.recents as recent (recent.path)}
          <button
            type="button"
            class="flex items-center gap-3 rounded-lg border border-line p-3 text-left transition-colors hover:bg-surface-hover"
            onclick={() => openPath(recent.path, recent.name, 'directory')}
          >
            <FileIcon item={{ name: recent.name, type: 'directory' }} />
            <span class="min-w-0">
              <span class="block truncate text-base text-fg-muted">{recent.name}</span>
              <span class="block truncate font-mono text-xs text-fg-faint">{displayPath(recent.path)}</span>
            </span>
          </button>
        {/each}
      </div>
    </section>
  {/if}
</div>
