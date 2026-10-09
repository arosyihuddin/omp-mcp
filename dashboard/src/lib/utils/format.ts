export const EMPTY = '—';

const GIB = 1024 ** 3;

export function formatGiB(bytes: number | null | undefined): string {
  return typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0 ? `${(bytes / GIB).toFixed(1)} GiB` : EMPTY;
}

export function formatSize(size: number | null): string {
  if (size === null) return EMPTY;
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  if (size < GIB) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / GIB).toFixed(1)} GB`;
}

export function formatDateTime(value?: string): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function formatDateShort(value: string): string {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Pretty-print a JSON string; falls back to the raw value. */
export function formatJson(value: string | null): string {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
