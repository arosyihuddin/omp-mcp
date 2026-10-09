import { previewKindFor, type PreviewKind } from './file-utils';

/** Which media file (if any) is open in the preview dialog. */
class PreviewStore {
  path = $state('');
  name = $state('');
  kind = $state<PreviewKind | null>(null);

  get open() {
    return this.kind !== null;
  }

  show(path: string, name: string) {
    this.kind = previewKindFor(name);
    if (!this.kind) return;
    this.path = path;
    this.name = name;
  }

  hide() {
    this.path = this.name = '';
    this.kind = null;
  }
}

export const preview = new PreviewStore();
