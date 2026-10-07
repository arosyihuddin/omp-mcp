export type Tool = {
  name: string;
  group: string;
  risk: 'low' | 'medium' | 'high' | 'isolated';
  description: string;
};
export type Session = {
  sessionId: string;
  status: string;
  model?: string;
  task?: string;
  cwd?: string;
  createdAt?: string;
  updatedAt?: string;
  collab?: { webUrl?: string; viewUrl?: string; instanceId?: string };
  result?: string;
  error?: string;
};
export type HostTelemetry = Record<string, unknown>;
