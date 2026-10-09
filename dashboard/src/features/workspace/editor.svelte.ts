import { errorMessage, workspaceApi, workspaceStateApi } from '$lib/api';
import type { WorkspaceItem } from '$lib/types';
import { basename, dirname } from './file-utils';
import { prefs } from './preferences.svelte';
import { readString, storageKeys, writeString } from '$lib/utils/storage';

export interface EditorTab {
  path: string;
  name: string;
  content: string;
  saved: string;
  preview: boolean;
  loading?: boolean;
}

class EditorStore {
  root = $state('');
  dir = $state('.');
  items = $state<WorkspaceItem[]>([]);
  treeLoading = $state(false);
  tabs = $state<EditorTab[]>([]);
  activePath = $state('');
  loading = $state(false);
  saving = $state(false);
  error = $state('');
  private sessionRoot = '';
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  activeTab = $derived(this.tabs.find((tab) => tab.path === this.activePath) ?? null);
  path = $derived(this.activeTab?.path ?? '');
  name = $derived(this.activeTab?.name ?? '');
  content = $derived(this.activeTab?.content ?? '');
  saved = $derived(this.activeTab?.saved ?? '');
  dirty = $derived(this.tabs.some((tab) => tab.content !== tab.saved));
  activeDirty = $derived(Boolean(this.activeTab && this.activeTab.content !== this.activeTab.saved));
  projectLabel = $derived(this.root ? (this.root === '.' ? 'Home' : basename(this.root)) : '');

  async loadDir(dir: string) {
    this.treeLoading = true;
    try {
      const data = await workspaceApi.list(dir);
      this.dir = data.path;
      this.items = data.items ?? [];
    } catch (cause) {
      this.error = errorMessage(cause, 'Unable to read folder');
    } finally {
      this.treeLoading = false;
    }
  }

  async restoreLastSession() {
    const root = readString(storageKeys.editorLastRoot);
    if (root) await this.openFolder(root);
  }

  async openFolder(path: string, name?: string) {
    this.root = path;
    writeString(storageKeys.editorLastRoot, path);
    writeString(storageKeys.editorLastRoot, path);
    this.dir = path;
    this.error = '';
    prefs.remember(path, name);
    await this.loadDir(path);
    await this.restoreSession(path);
  }

  async restoreSession(root: string) {
    if (this.sessionRoot === root) return;
    this.sessionRoot = root;
    try {
      const session = await workspaceStateApi.getEditorSession(root);
      if (!session) return;
      const previewPath = readString('omp-editor-preview:' + root);
      for (const path of session.tabs) await this.openFile(path, undefined, path === previewPath, false);
      if (session.activePath && this.tabs.some((tab) => tab.path === session.activePath)) this.activePath = session.activePath;
    } catch {
      // Session restore is best-effort; the editor remains usable when persistence is unavailable.
    }
  }

  async openFile(path: string, name?: string, preview = false, focus = true) {
    const existing = this.tabs.find((tab) => tab.path === path);
    if (existing) {
      existing.preview = existing.preview && preview;
      if (focus) this.activePath = path;
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      const content = await workspaceApi.readFile(path);
      const parent = dirname(path);
      if (!this.root) {
        this.root = parent;
        this.sessionRoot = parent;
        await this.loadDir(parent);
      }
      const tab: EditorTab = { path, name: name ?? basename(path), content, saved: content, preview };
      if (preview) {
        const previewIndex = this.tabs.findIndex((item) => item.preview && item.content === item.saved);
        if (previewIndex >= 0) this.tabs.splice(previewIndex, 1, tab);
        else this.tabs.push(tab);
      } else {
        this.tabs.push(tab);
      }
      if (focus) this.activePath = path;
      prefs.remember(parent, parent === '.' ? 'Home' : undefined);
      this.scheduleSessionSave();
    } catch (cause) {
      this.error = errorMessage(cause, 'Unable to open file');
    } finally {
      this.loading = false;
    }
  }

  editActive(content: string) {
    const tab = this.activeTab;
    if (!tab) return;
    tab.content = content;
    tab.preview = false;
    this.scheduleSessionSave();
  }

  makePermanent(path: string) {
    const tab = this.tabs.find((item) => item.path === path);
    if (tab) tab.preview = false;
    this.scheduleSessionSave();
  }

  async save(path = this.activePath) {
    const tab = this.tabs.find((item) => item.path === path);
    if (!tab || tab.content === tab.saved || this.saving) return;
    this.saving = true;
    this.error = '';
    try {
      await workspaceApi.writeFile(tab.path, tab.content);
      tab.saved = tab.content;
    } catch (cause) {
      this.error = errorMessage(cause, 'Unable to save file');
    } finally {
      this.saving = false;
    }
  }

  async saveAll() {
    for (const tab of this.tabs) if (tab.content !== tab.saved) await this.save(tab.path);
  }

  closeTab(path: string) {
    const index = this.tabs.findIndex((tab) => tab.path === path);
    if (index < 0) return;
    const wasActive = this.activePath === path;
    this.tabs.splice(index, 1);
    if (wasActive) this.activePath = this.tabs[Math.min(index, this.tabs.length - 1)]?.path ?? '';
    this.scheduleSessionSave();
  }

  closeOthers(path: string) {
    this.tabs = this.tabs.filter((tab) => tab.path === path);
    this.activePath = path;
    this.scheduleSessionSave();
  }

  closeSaved() {
    this.tabs = this.tabs.filter((tab) => tab.content !== tab.saved);
    if (!this.tabs.some((tab) => tab.path === this.activePath)) this.activePath = this.tabs.at(-1)?.path ?? '';
    this.scheduleSessionSave();
  }

  closeAll() {
    this.tabs = [];
    this.activePath = '';
    this.scheduleSessionSave();
  }

  private scheduleSessionSave() {
    if (!this.root) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const previewTab = this.tabs.find((tab) => tab.preview);
      if (previewTab) writeString('omp-editor-preview:' + this.root, previewTab.path);
      else writeString('omp-editor-preview:' + this.root, '');
      void workspaceStateApi.saveEditorSession(this.root, this.tabs.map((tab) => tab.path), this.activePath || null).catch(() => {});
    }, 500);
  }
}

export const editor = new EditorStore();
