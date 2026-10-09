import { errorMessage, workspaceApi } from '$lib/api';
import type { WorkspaceItem } from '$lib/types';
import { joinPath } from './file-utils';

/** Directory listing + back/forward history for the Files view. Survives route changes. */
class WorkspaceBrowser {
  path = $state('.');
  /** Latest requested directory — keeps refresh() correct while a load is in flight. */
  private target = '.';
  private seq = 0;
  items = $state<WorkspaceItem[]>([]);
  loading = $state(false);
  error = $state('');
  back = $state<string[]>([]);
  forward = $state<string[]>([]);

  /** Load a directory without touching history. */
  async open(path: string) {
    const id = ++this.seq;
    this.target = path;
    this.loading = true;
    this.error = '';
    try {
      const data = await workspaceApi.list(path);
      if (id !== this.seq) return; // a newer request superseded this one
      this.path = data.path;
      this.items = data.items ?? [];
    } catch (error) {
      if (id === this.seq) this.error = errorMessage(error, 'Unable to read workspace');
    } finally {
      if (id === this.seq) this.loading = false;
    }
  }

  /** Reload the directory most recently requested. */
  refresh() {
    return this.open(this.target);
  }

  /** User-initiated navigation: records history. */
  navigate(next: string) {
    if (next === this.path && next === this.target) return;
    this.back = [...this.back, this.path];
    this.forward = [];
    return this.open(next);
  }

  goBack() {
    const previous = this.back.at(-1);
    if (previous === undefined) return;
    this.back = this.back.slice(0, -1);
    this.forward = [this.path, ...this.forward];
    return this.open(previous);
  }

  goForward() {
    const next = this.forward[0];
    if (next === undefined) return;
    this.forward = this.forward.slice(1);
    this.back = [...this.back, this.path];
    return this.open(next);
  }

  child(name: string) {
    return joinPath(this.path, name);
  }

  async remove(item: WorkspaceItem) {
    try {
      await workspaceApi.remove(this.child(item.name));
      await this.refresh();
    } catch (error) {
      this.error = errorMessage(error, 'Unable to delete item');
    }
  }
}

export const browser = new WorkspaceBrowser();
