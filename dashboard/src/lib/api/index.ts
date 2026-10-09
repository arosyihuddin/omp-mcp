import type {
  Approval,
  EditorSession,
  FavoriteEntry,
  PinEntry,
  Profile,
  RecentEntry,
  WorkspaceState,
  WorkspaceStat,
  ApprovalDecision,
  DashboardSnapshot,
  Session,
  TerminalInfo,
  Tool,
  ToolCallLog,
  WorkspaceItem,
} from '$lib/types';
import { postJson, request } from './http';

export { errorMessage } from './http';

const enc = encodeURIComponent;

export const dashboardApi = {
  snapshot: () => request<DashboardSnapshot>('/api/dashboard'),
};

export const toolsApi = {
  list: async () => (await request<{ tools: Tool[] }>('/api/tools')).tools ?? [],
  setExposed: async (name: string, exposed: boolean) =>
    (
      await request<{ tool: Tool }>(`/api/tools/${enc(name)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ exposed }),
      })
    ).tool,
};

export const approvalsApi = {
  list: async () => (await request<{ approvals: Approval[] }>('/api/approvals')).approvals ?? [],
  decide: (id: string, decision: ApprovalDecision) => postJson(`/api/approvals/${enc(id)}/${decision}`),
  clear: () => postJson('/api/approvals/clear'),
};

export const sessionsApi = {
  act: (sessionId: string, action: 'interrupt' | 'dispose') =>
    postJson<Session>(`/api/sessions/${enc(sessionId)}/${action}`),
};

export const logsApi = {
  list: async (limit = 200) => (await request<{ logs: ToolCallLog[] }>(`/api/logs?limit=${limit}`)).logs ?? [],
};

export const terminalsApi = {
  list: async () => (await request<{ terminals: TerminalInfo[] }>('/api/terminals')).terminals ?? [],
  create: async () => (await postJson<{ terminal: TerminalInfo }>('/api/terminals', {})).terminal,
  close: (id: string) => request(`/api/terminals/${enc(id)}`, { method: 'DELETE' }),
  socketUrl: (id: string) =>
    `${location.protocol === 'https:' ? 'wss://' : 'ws://'}${location.host}/api/terminal/socket?id=${enc(id)}`,
};

export const workspaceApi = {
  list: (path: string) => request<{ path: string; items: WorkspaceItem[] }>(`/api/workspace?path=${enc(path)}`),
  remove: (path: string) => request(`/api/workspace?path=${enc(path)}`, { method: 'DELETE' }),
  readFile: async (path: string) =>
    (await request<{ content?: string }>(`/api/workspace/file?path=${enc(path)}`)).content ?? '',
  writeFile: (path: string, content: string) =>
    request(`/api/workspace/file?path=${enc(path)}`, {
      method: 'PUT',
      headers: { 'content-type': 'text/plain; charset=utf-8' },
      body: content,
    }),
  previewUrl: (path: string) => `/api/workspace/preview?path=${enc(path)}`,
  create: (path: string, type: 'file' | 'directory') => postJson<{ path: string }>('/api/workspace/create', { path, type }),
  rename: (path: string, newName: string) => postJson<{ path: string; name: string }>('/api/workspace/rename', { path, newName }),
  duplicate: (path: string) => postJson<{ path: string; name: string }>('/api/workspace/duplicate', { path }),
  move: (path: string, destDir: string) => postJson<{ path: string }>('/api/workspace/move', { path, destDir }),
  stat: (path: string) => request<WorkspaceStat>(`/api/workspace/stat?path=${enc(path)}`),
  downloadUrl: (path: string) => `/api/workspace/download?path=${enc(path)}`,
};

export const profileApi = {
  get: () => request<Profile>('/api/profile'),
  update: (input: Partial<Pick<Profile, 'displayName' | 'role' | 'avatarColor'>>) =>
    request<Profile>('/api/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }),
};

const put = <T>(url: string, body: unknown) =>
  request<T>(url, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export const workspaceStateApi = {
  state: () => request<WorkspaceState>('/api/workspace/state'),
  addPin: (path: string, name: string) => postJson<{ pins: PinEntry[] }>('/api/workspace/pins', { path, name }),
  removePin: (path: string) => request<{ pins: PinEntry[] }>(`/api/workspace/pins?path=${enc(path)}`, { method: 'DELETE' }),
  reorderPins: (paths: string[]) => put<{ pins: PinEntry[] }>('/api/workspace/pins/order', { paths }),
  addFavorite: (path: string, name: string, type: 'file' | 'directory') =>
    postJson<{ favorites: FavoriteEntry[] }>('/api/workspace/favorites', { path, name, type }),
  removeFavorite: (path: string) =>
    request<{ favorites: FavoriteEntry[] }>(`/api/workspace/favorites?path=${enc(path)}`, { method: 'DELETE' }),
  touchRecent: (path: string, name: string) => postJson<{ recents: RecentEntry[] }>('/api/workspace/recents', { path, name }),
  clearRecents: () => request<{ recents: RecentEntry[] }>('/api/workspace/recents', { method: 'DELETE' }),
  setPref: (key: string, value: string) => put<{ prefs: Record<string, string> }>('/api/workspace/prefs', { key, value }),
  getEditorSession: async (root: string) =>
    (await request<{ session: EditorSession | null }>(`/api/workspace/editor-session?root=${enc(root)}`)).session,
  saveEditorSession: (root: string, tabs: string[], activePath: string | null) =>
    put<{ session: EditorSession | null }>('/api/workspace/editor-session', { root, tabs, activePath }),
};
