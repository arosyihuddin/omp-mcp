import { errorMessage, workspaceApi } from '$lib/api';
import type { WorkspaceItem } from '$lib/types';
import { basename, dirname } from './file-utils';
import { prefs } from './preferences.svelte';

/** Editor state: the open file plus its own folder tree (independent from the Files view). */
class EditorStore {
  root = $state('');
  dir = $state('.');
  items = $state<WorkspaceItem[]>([]);
  treeLoading = $state(false);

  path = $state('');
  name = $state('');
  content = $state('');
  saved = $state('');
  loading = $state(false);
  saving = $state(false);
  error = $state('');

  dirty = $derived(this.content !== this.saved);
  projectLabel = $derived(this.dir === '.' ? 'Home' : basename(this.dir));

  async loadDir(dir: string) {
    this.treeLoading = true;
    try {
      const data = await workspaceApi.list(dir);
      this.dir = data.path;
      this.items = data.items ?? [];
    } catch (error) {
      this.error = errorMessage(error, 'Unable to read folder');
    } finally {
      this.treeLoading = false;
    }
  }

  async openFolder(path: string, name?: string) {
    this.root = path;
    this.path = this.name = this.content = this.saved = '';
    this.error = '';
    prefs.remember(path, name);
    await this.loadDir(path);
  }

  async openFile(path: string, name?: string) {
    if (this.dirty && path !== this.path && !window.confirm(`Discard unsaved changes to ${this.name}?`)) return;
    this.loading = true;
    this.error = '';
    try {
      const content = await workspaceApi.readFile(path);
      const parent = dirname(path);
      this.path = path;
      this.name = name ?? basename(path);
      this.content = this.saved = content;
      this.root = parent;
      prefs.remember(parent, parent === '.' ? 'Home' : undefined);
      if (this.dir !== parent || this.items.length === 0) await this.loadDir(parent);
    } catch (error) {
      this.error = errorMessage(error, 'Unable to open file');
    } finally {
      this.loading = false;
    }
  }

  async save() {
    if (!this.path || !this.dirty || this.saving) return;
    this.saving = true;
    this.error = '';
    try {
      await workspaceApi.writeFile(this.path, this.content);
      this.saved = this.content;
    } catch (error) {
      this.error = errorMessage(error, 'Unable to save file');
    } finally {
      this.saving = false;
    }
  }
}

export const editor = new EditorStore();
