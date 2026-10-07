export type Tool = {
  name: string;
  group: string;
  risk: 'low' | 'medium' | 'high' | 'isolated';
  description: string;
};
export type Session = { sessionId: string; status: string; model?: string; task?: string };
export type HostTelemetry = Record<string, unknown>;
