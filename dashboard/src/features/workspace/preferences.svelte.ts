import type { WorkspaceItem } from '$lib/types';
import { readJson, readString, storageKeys, writeJson, writeString } from '$lib/utils/storage';
import { basename } from './file-utils';

export interface Favorite {
  name: string;
  path: string;
  type?: WorkspaceItem['type'];
}
export interface Recent {
  name: string;
  path: string;
}
export type FileView = 'list' | 'grid';

const array = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Persisted workspace preferences: favorites, recent folders and view options. */
class WorkspacePrefs {
  favorites = $state<Favorite[]>(array(readJson<unknown>(storageKeys.workspaceFavorites, [])));
  recents = $state<Recent[]>(array(readJson<unknown>(storageKeys.workspaceRecents, [])));
  view = $state<FileView>(readString(storageKeys.workspaceView) === 'grid' ? 'grid' : 'list');
  showHidden = $state(readString(storageKeys.workspaceHidden) === 'true');

  isFavorite(path: string) {
    return this.favorites.some((item) => item.path === path);
  }

  toggleFavorite(path: string, name?: string, type: WorkspaceItem['type'] = 'directory') {
    if (path === '.') return;
    this.favorites = this.isFavorite(path)
      ? this.favorites.filter((item) => item.path !== path)
      : [...this.favorites, { name: name ?? basename(path), path, type }];
    writeJson(storageKeys.workspaceFavorites, this.favorites);
  }

  remember(path: string, name?: string) {
    if (path === '.') return;
    this.recents = [{ name: name ?? basename(path), path }, ...this.recents.filter((item) => item.path !== path)].slice(0, 8);
    writeJson(storageKeys.workspaceRecents, this.recents);
  }

  setView(view: FileView) {
    this.view = view;
    writeString(storageKeys.workspaceView, view);
  }

  setShowHidden(value: boolean) {
    this.showHidden = value;
    writeString(storageKeys.workspaceHidden, String(value));
  }
}

export const prefs = new WorkspacePrefs();
