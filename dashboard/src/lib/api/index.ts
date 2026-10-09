import type {
  Approval,
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
};
