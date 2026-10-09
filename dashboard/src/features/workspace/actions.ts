import { router } from '$lib/stores/router.svelte';
import type { WorkspaceItem } from '$lib/types';
import { browser } from './browser.svelte';
import { editor } from './editor.svelte';
import { isPreviewable } from './file-utils';
import { preview } from './preview.svelte';

/**
 * Operations a file row can offer. Every member except `open` is optional:
 * a view only gets the menu entries for the operations it implements.
 */
export interface FileActions {
  open: (item: WorkspaceItem, path: string) => void;
  openInEditor?: (item: WorkspaceItem, path: string) => void;
  rename?: (item: WorkspaceItem, path: string) => void;
  duplicate?: (item: WorkspaceItem, path: string) => void;
  move?: (item: WorkspaceItem, path: string) => void;
  remove?: (item: WorkspaceItem, path: string) => void;
  properties?: (item: WorkspaceItem, path: string) => void;
  download?: (item: WorkspaceItem, path: string) => void;
  newIn?: (item: WorkspaceItem, path: string, type: 'file' | 'directory') => void;
  copyPath?: (item: WorkspaceItem, path: string, relative: boolean) => void;
}

/** Inline rename / create state and context-menu hook shared by the list and grid. */
export interface RowInteractions {
  /** Name of the item currently being renamed in place. */
  renaming: string | null;
  /** Kind of entry being created in place (a draft row is shown first). */
  creating: 'file' | 'directory' | null;
  error: string;
  /** Bumped after a failed commit so the input remounts and accepts another try. */
  attempt: number;
  /** Last rejected name, restored into the input after a failed commit. */
  draft: string;
  onrename: (item: WorkspaceItem, newName: string) => void;
  oncreate: (name: string) => void;
  oncancel: () => void;
  oncontext: (event: MouseEvent, item: WorkspaceItem, path: string) => void;
}

/** F2 / Delete shortcuts on a focused row (ignored while typing in an input). */
export function rowShortcut(event: KeyboardEvent, item: WorkspaceItem, path: string, actions: FileActions) {
  if ((event.target as HTMLElement).tagName === 'INPUT') return;
  if (event.key === 'F2' && actions.rename) {
    event.preventDefault();
    actions.rename(item, path);
  } else if (event.key === 'Delete' && actions.remove) {
    event.preventDefault();
    actions.remove(item, path);
  }
}

export function openInEditor(path: string, name?: string) {
  router.navigate('workspace-editor');
  void editor.openFile(path, name);
}

/** Open a folder as the editor's project. */
export function openProject(path: string, name?: string) {
  router.navigate('workspace-editor');
  void editor.openFolder(path, name);
}

/** Open any workspace path in the most appropriate view. */
export function openPath(path: string, name: string, type: WorkspaceItem['type']) {
  if (type === 'directory') {
    void browser.navigate(path);
    router.navigate('workspace-files');
  } else if (isPreviewable(name)) {
    router.navigate('workspace-files');
    preview.show(path, name);
  } else {
    openInEditor(path, name);
  }
}

/** `~/path` — the form shown to users for a workspace path. */
export const homePath = (path: string) => (path === '.' ? '~' : `~/${path}`);

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
