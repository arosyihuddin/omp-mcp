export type SessionStatus =
  | "starting"
  | "running"
  | "completed"
  | "failed"
  | "interrupted";

export interface CollabInfo {
  webUrl?: string;
  viewUrl?: string;
  instanceId?: string;
}

export interface OmpSession {
  sessionId: string;
  task: string;
  cwd: string;
  model?: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  collab?: CollabInfo;
  output: string[];
  result?: string;
  error?: string;
}
