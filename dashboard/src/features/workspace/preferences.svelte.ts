import { errorMessage, workspaceStateApi } from '$lib/api';
import type { FavoriteEntry, PinEntry, RecentEntry, WorkspaceItem } from '$lib/types';
import { readJson, readString, storageKeys } from '$lib/utils/storage';
import { basename } from './file-utils';

export type FileView = 'list' | 'grid';
export type SortBy = 'name' | 'size' | 'modified';
export type SortDir = 'asc' | 'desc';

const array = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

function clearLegacy() {
  try {
    for (const key of [storageKeys.workspaceFavorites, storageKeys.workspaceRecents, storageKeys.workspaceView, storageKeys.workspaceHidden])
      localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

/** Workspace preferences, backed by the control-plane database. */
class WorkspacePrefs {
  pins = $state<PinEntry[]>([]);
  favorites = $state<FavoriteEntry[]>([]);
  recents = $state<RecentEntry[]>([]);
  view = $state<FileView>('list');
  showHidden = $state(false);
  sortBy = $state<SortBy>('name');
  sortDir = $state<SortDir>('asc');
  loaded = $state(false);
  /** Last failed pin/favorite request, shown by the Files view. */
  error = $state('');
  private loading: Promise<void> | null = null;

  /** Load persisted state once; imports pre-database localStorage data on first run. */
  init() {
    this.loading ??= this.load();
    return this.loading;
  }

  /** Re-read everything (after rename / move / delete changed stored paths). */
  async reload() {
    try {
      this.apply(await workspaceStateApi.state());
    } catch {
      /* keep what we have */
    }
  }

  private apply(state: Awaited<ReturnType<typeof workspaceStateApi.state>>) {
    this.pins = state.pins;
    this.favorites = state.favorites;
    this.recents = state.recents;
    const { view, showHidden, sortBy, sortDir } = state.prefs;
    this.view = view === 'grid' ? 'grid' : 'list';
    this.showHidden = showHidden === 'true';
    this.sortBy = sortBy === 'size' || sortBy === 'modified' ? sortBy : 'name';
    this.sortDir = sortDir === 'desc' ? 'desc' : 'asc';
  }

  private async load() {
    try {
      let state = await workspaceStateApi.state();
      const legacyFavorites = array<{ name?: string; path?: string; type?: string }>(readJson<unknown>(storageKeys.workspaceFavorites, []));
      const legacyRecents = array<{ name?: string; path?: string }>(readJson<unknown>(storageKeys.workspaceRecents, []));
      const legacyView = readString(storageKeys.workspaceView);
      const legacyHidden = readString(storageKeys.workspaceHidden);
      const hasLegacy = legacyFavorites.length || legacyRecents.length || legacyView || legacyHidden;
      if (hasLegacy) {
        if (state.favorites.length === 0)
          for (const f of legacyFavorites)
            if (f.path) await workspaceStateApi.addFavorite(f.path, f.name ?? basename(f.path), f.type === 'file' ? 'file' : 'directory');
        if (state.recents.length === 0)
          for (const r of [...legacyRecents].reverse()) if (r.path) await workspaceStateApi.touchRecent(r.path, r.name ?? basename(r.path));
        if (legacyView && state.prefs.view === undefined) await workspaceStateApi.setPref('view', legacyView === 'grid' ? 'grid' : 'list');
        if (legacyHidden && state.prefs.showHidden === undefined) await workspaceStateApi.setPref('showHidden', String(legacyHidden === 'true'));
        state = await workspaceStateApi.state();
        clearLegacy();
      }
      this.apply(state);
    } catch {
      /* offline: defaults stay */
    } finally {
      this.loaded = true;
    }
  }

  /* ------------------------------ pins ------------------------------ */
  isPinned(path: string) {
    return this.pins.some((item) => item.path === path);
  }

  async togglePin(path: string, name?: string) {
    if (path === '.') return;
    this.error = '';
    const before = this.pins;
    try {
      if (this.isPinned(path)) {
        this.pins = before.filter((item) => item.path !== path);
        this.pins = (await workspaceStateApi.removePin(path)).pins;
      } else {
        this.pins = [...before, { path, name: name ?? basename(path), sortOrder: before.length }];
        this.pins = (await workspaceStateApi.addPin(path, name ?? basename(path))).pins;
      }
    } catch (error) {
      this.pins = before;
      this.error = errorMessage(error, 'Unable to update pinned folders');
    }
  }

  /* ---------------------------- favorites ---------------------------- */
  isFavorite(path: string) {
    return this.favorites.some((item) => item.path === path);
  }

  async toggleFavorite(path: string, name?: string, type: WorkspaceItem['type'] = 'directory') {
    if (path === '.') return;
    this.error = '';
    const before = this.favorites;
    try {
      if (this.isFavorite(path)) {
        this.favorites = before.filter((item) => item.path !== path);
        this.favorites = (await workspaceStateApi.removeFavorite(path)).favorites;
      } else {
        this.favorites = [...before, { path, name: name ?? basename(path), type }];
        this.favorites = (await workspaceStateApi.addFavorite(path, name ?? basename(path), type)).favorites;
      }
    } catch (error) {
      this.favorites = before;
      this.error = errorMessage(error, 'Unable to update favorites');
    }
  }

  /* ----------------------------- recents ----------------------------- */
  remember(path: string, name?: string) {
    if (path === '.') return;
    const label = name ?? basename(path);
    this.recents = [{ path, name: label, openedAt: new Date().toISOString() }, ...this.recents.filter((item) => item.path !== path)].slice(0, 20);
    void workspaceStateApi.touchRecent(path, label).catch(() => {});
  }

  /* ------------------------- view preferences ------------------------- */
  private save(key: string, value: string) {
    void workspaceStateApi.setPref(key, value).catch(() => {});
  }

  setView(view: FileView) {
    this.view = view;
    this.save('view', view);
  }

  setShowHidden(value: boolean) {
    this.showHidden = value;
    this.save('showHidden', String(value));
  }

  setSort(by: SortBy, dir: SortDir = this.sortDir) {
    this.sortBy = by;
    this.sortDir = dir;
    this.save('sortBy', by);
    this.save('sortDir', dir);
  }
}

export const prefs = new WorkspacePrefs();
