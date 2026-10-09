import { router } from '$lib/stores/router.svelte';
import type { WorkspaceItem } from '$lib/types';
import { browser } from './browser.svelte';
import { editor } from './editor.svelte';
import { isPreviewable } from './file-utils';
import { preview } from './preview.svelte';

export interface FileActions {
  open: (item: WorkspaceItem) => void;
  edit: (item: WorkspaceItem) => void;
  remove: (item: WorkspaceItem) => void;
}

export function openInEditor(path: string, name?: string) {
  router.navigate('workspace-editor');
  void editor.openFile(path, name);
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
