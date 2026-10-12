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

export interface OmpChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  createdAt: string;
  toolName?: string;
  toolCallId?: string;
  arguments?: string;
  result?: string;
  status?: "running" | "completed" | "failed";
  isError?: boolean;
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
  messages: OmpChatMessage[];
  result?: string;
  error?: string;
  /** Internal SDK transcript path used to rehydrate the agent after RAM cleanup. */
  sdkSessionFile?: string;
}
