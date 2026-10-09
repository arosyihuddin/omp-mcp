export type PreviewKind = 'image' | 'pdf' | 'audio' | 'video';

const previewExtensions: Record<string, PreviewKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', bmp: 'image', ico: 'image', svg: 'image', avif: 'image',
  pdf: 'pdf',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', aac: 'audio', flac: 'audio',
  mp4: 'video', webm: 'video', mov: 'video', m4v: 'video', ogv: 'video',
};

export function previewKindFor(name: string): PreviewKind | null {
  const extension = name.split('.').at(-1)?.toLowerCase() ?? '';
  return previewExtensions[extension] ?? null;
}

export const isPreviewable = (name: string) => previewKindFor(name) !== null;

/** Workspace paths are relative to the home directory; "." is the root. */
export const joinPath = (base: string, name: string) => (base === '.' ? name : `${base}/${name}`);
export const basename = (path: string) => path.split('/').filter(Boolean).at(-1) ?? path;
export const dirname = (path: string) => path.split('/').slice(0, -1).join('/') || '.';
export const displayPath = (path: string) => (path === '.' ? '/home' : `/home/${path}`);
export const isHidden = (name: string) => name.startsWith('.');
