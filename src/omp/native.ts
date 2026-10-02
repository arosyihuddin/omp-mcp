import { createAgentSession, Settings } from "@oh-my-pi/pi-coding-agent";
import { config } from "../lib/config";
import type { AgentSession } from "@oh-my-pi/pi-coding-agent";
import type { AgentTool } from "@oh-my-pi/pi-agent-core";

export interface NativeTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(args: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>;
}

type JsonSchema = Record<string, unknown>;

function toJsonSchema(parameters: unknown): JsonSchema {
  if (
    parameters &&
    (typeof parameters === "object" || typeof parameters === "function") &&
    "toJsonSchema" in parameters &&
    typeof parameters.toJsonSchema === "function"
  ) {
    return parameters.toJsonSchema() as JsonSchema;
  }
  return { type: "object", additionalProperties: true };
}

function getToolDescription(tool: AgentTool): string {
  return tool.description || tool.summary || tool.name;
}

function resultToJson(value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "content" in value) return value;
  return value;
}

export class NativeToolRuntime {
  private sessions = new Map<string, AgentSession>();
  private pending = new Map<string, Promise<AgentSession>>();

  async getSession(cwd = config.ompDefaultCwd): Promise<AgentSession> {
    const key = cwd || config.ompDefaultCwd;
    const existing = this.sessions.get(key);
    if (existing) return existing;

    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight;

    const settings = Settings.isolated({
      "astGrep.enabled": true,
      "github.enabled": true,
      "security.enabled": false,
      "find.enabled": "on",
      "compaction.experimentalContextManagement": true,
      "autolearn.enabled": true,
      "memory.backend": "local",
    });

    const promise = createAgentSession({
      cwd: key,
      settings,
      enableMCP: false,
      enableLsp: true,
      skipPythonPreflight: true,
      autoApprove: true,
    }).then(({ session }) => {
      this.sessions.set(key, session);
      this.pending.delete(key);
      return session;
    }).catch((error) => {
      this.pending.delete(key);
      throw error;
    });

    this.pending.set(key, promise);
    return promise;
  }

  async list(cwd = config.ompDefaultCwd): Promise<NativeTool[]> {
    const session = await this.getSession(cwd);
    return session
      .getEnabledToolNames()
      .filter((name) => !name.startsWith("mcp__"))
      .map((name) => session.getToolByName(name))
      .filter((tool): tool is AgentTool => Boolean(tool))
      .map((tool) => ({
        name: tool.name,
        description: getToolDescription(tool),
        inputSchema: toJsonSchema(tool.parameters),
        execute: async (args, signal) => {
          const result = await tool.execute(
            `mcp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            args,
            signal,
          );
          return resultToJson(result);
        },
      }));
  }

  async get(name: string, cwd = config.ompDefaultCwd): Promise<NativeTool | undefined> {
    const session = await this.getSession(cwd);
    if (name.startsWith("mcp__")) return undefined;
    const tool = session.getToolByName(name);
    if (!tool) return undefined;

    return {
      name: tool.name,
      description: getToolDescription(tool),
      inputSchema: toJsonSchema(tool.parameters),
      execute: async (args, signal) => {
        const result = await tool.execute(
          `mcp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          args,
          signal,
        );
        return resultToJson(result);
      },
    };
  }

  async dispose(): Promise<void> {
    const sessions = [...this.sessions.values()];
    this.sessions.clear();
    this.pending.clear();
    await Promise.allSettled(sessions.map((session) => session.dispose()));
  }
}

export const nativeRuntime = new NativeToolRuntime();
