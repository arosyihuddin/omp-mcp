import {
  createAgentSession,
  discoverAuthStorage,
  ModelRegistry,
  SessionManager,
  Settings,
  type AgentSession,
} from "@oh-my-pi/pi-coding-agent";
import { CollabHost } from "@oh-my-pi/pi-coding-agent/collab/host";
import { DEFAULT_RELAY_URL } from "@oh-my-pi/pi-coding-agent/collab/protocol";
import type { InteractiveModeContext } from "@oh-my-pi/pi-coding-agent/modes/types";
import { config } from "../lib/config";
import { emitDashboardEvent } from "../dashboard/events";
import type { OmpSession } from "./types";


function now() {
  return new Date().toISOString();
}

function createId() {
  return `sdk-${crypto.randomUUID()}`;
}

export class OmpSdkSessionManager {
  private readonly sessions = new Map<string, OmpSession>();
  private readonly agents = new Map<string, AgentSession>();
  private readonly unsubscribers = new Map<string, () => void>();
  private readonly collabHosts = new Map<string, CollabHost>();

  get(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  list() {
    return [...this.sessions.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  getCollab(sessionId: string) {
    const host = this.collabHosts.get(sessionId);
    if (!host) return undefined;

    return {
      webUrl: host.webLink,
      viewUrl: host.webViewLink,
      instanceId: host.instanceId,
    };
  }

  async start(task: string, cwd: string, modelName?: string): Promise<OmpSession> {
    const selectedModel = modelName ?? config.ompDefaultModel;
    const sessionId = createId();
    const session: OmpSession = {
      sessionId,
      task,
      cwd,
      model: selectedModel,
      status: "starting",
      createdAt: now(),
      updatedAt: now(),
      output: [],
    };

    const settings = Settings.isolated({
      "astGrep.enabled": true,
      "checkpoint.enabled": true,
      "github.enabled": true,
      "security.enabled": true,
      "find.enabled": "on",
      "compaction.experimentalContextManagement": true,
      "autolearn.enabled": true,
      "memory.backend": "local",
    });

    let model;
    let authStorage;
    let modelRegistry;

    if (selectedModel) {
      authStorage = await discoverAuthStorage();
      modelRegistry = new ModelRegistry(authStorage);
      await modelRegistry.refresh();
      model = this.resolveModel(selectedModel, modelRegistry);
    }

    const { session: agent } = await createAgentSession({
      cwd,
      settings,
      model,
      authStorage,
      modelRegistry,
      sessionManager: SessionManager.create(cwd),
      enableMCP: false,
      enableLsp: true,
      skipPythonPreflight: true,
      autoApprove: true,
    });

    this.sessions.set(sessionId, session);
    this.agents.set(sessionId, agent);
    emitDashboardEvent({ type: "session.created", data: session });

    const collab = await this.startCollab(sessionId, agent);
    if (collab) {
      session.collab = collab;
      emitDashboardEvent({ type: "session.updated", data: session });
    }



    const unsubscribe = agent.subscribe((event) => {
      session.updatedAt = now();

      if (event.type === "agent_start" || event.type === "turn_start") {
        session.status = "running";
      }

      if (
        event.type === "message_update" &&
        event.assistantMessageEvent.type === "text_delta"
      ) {
        const delta = event.assistantMessageEvent.delta;
        if (delta) session.output.push(delta);
      }

      if (event.type === "message_end") {
        const message = event.message as any;
        if (message?.role === "assistant") {
          if (message.stopReason === "error") {
            session.status = "failed";
            session.error = message.errorMessage || "OMP model request failed";
          }

          if (Array.isArray(message.content)) {
            const text = message.content
              .filter((part: any) => part?.type === "text" && typeof part.text === "string")
              .map((part: any) => part.text)
              .join("");
            if (text) session.result = text;
          }
        }
      }

      if (event.type === "agent_end" && event.isTerminal !== false) {
        session.result =
          session.result || agent.getLastAssistantText() || session.output.join("");
        if (session.status !== "failed" && session.status !== "interrupted") {
          session.status = "completed";
        }
      }
      emitDashboardEvent({ type: "session.updated", data: session });

    });

    this.unsubscribers.set(sessionId, unsubscribe);

    void agent.prompt(task)
      .then(() => {
        session.result =
          agent.getLastAssistantText() ||
          session.result ||
          session.output.join("");
        if (session.status !== "failed" && session.status !== "interrupted") {
          session.status = "completed";
        }
        session.updatedAt = now();
        emitDashboardEvent({ type: "session.updated", data: session });

      })
      .catch((error) => {
        session.status = "failed";
        session.error = error instanceof Error ? error.message : String(error);
        session.updatedAt = now();
        emitDashboardEvent({ type: "session.updated", data: session });

      });

    return session;
  }

  async resume(sessionId: string, task: string): Promise<OmpSession> {
    const session = this.sessions.get(sessionId);
    const agent = this.agents.get(sessionId);

    if (!session || !agent) {
      throw new Error(`SDK session ${sessionId} is not running`);
    }

    session.task = task;
    session.status = "running";
    session.result = undefined;
    session.error = undefined;
    session.output = [];
    session.updatedAt = now();
    emitDashboardEvent({ type: "session.updated", data: session });


    void agent.prompt(task)
      .then(() => {
        session.result =
          agent.getLastAssistantText() ||
          session.result ||
          session.output.join("");
        if (session.status !== "failed" && session.status !== "interrupted") {
          session.status = "completed";
        }
        session.updatedAt = now();
      })
      .catch((error) => {
        session.status = "failed";
        session.error = error instanceof Error ? error.message : String(error);
        session.updatedAt = now();
      });

    return session;
  }

  async interrupt(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    const agent = this.agents.get(sessionId);

    if (!session || !agent) return false;

    await agent.abort({
      goalReason: "interrupted",
      reason: "MCP interrupt",
    });

    session.status = "interrupted";
    session.updatedAt = now();
    emitDashboardEvent({ type: "session.updated", data: session });
    return true;

  }

  async dispose(sessionId?: string): Promise<void> {
    const ids = sessionId ? [sessionId] : [...this.agents.keys()];

    await Promise.allSettled(
      ids.map(async (id) => {
        this.unsubscribers.get(id)?.();
        this.unsubscribers.delete(id);

        const collab = this.collabHosts.get(id);
        this.collabHosts.delete(id);
        if (collab) await collab.stop("MCP session disposed").catch(() => {});

        const agent = this.agents.get(id);
        this.agents.delete(id);

        if (agent) await agent.dispose();

        this.sessions.delete(id);
        emitDashboardEvent({ type: "session.removed", data: { sessionId: id } });
      }),
    );
  }

  private resolveModel(modelName: string, modelRegistry: ModelRegistry) {
    const [provider, ...idParts] = modelName.split("/");
    const id = idParts.length > 0 ? idParts.join("/") : modelName;
    const candidates = idParts.length > 0
      ? [provider]
      : ["google-antigravity", "google-gemini-cli", "google"];

    for (const candidate of candidates) {
      const model = modelRegistry.find(candidate, id);
      if (model) return model;
    }

    throw new Error(
      `Unknown OMP model: ${modelName}. Use provider/model, for example google-antigravity/gemini-3.1-pro.`,
    );
  }

  private async startCollab(sessionId: string, agent: AgentSession) {
    const sessionManager = agent.sessionManager;
    const statusLine = {
      setCollabStatus: (_status: unknown) => {},
      invalidate: () => {},
      getCachedContextBreakdown: () => ({
        usedTokens: 0,
        contextWindow: agent.model?.contextWindow ?? 0,
      }),
    };
    const ui = { requestRender: () => {} };

    const context = {
      session: agent,
      sessionManager,
      settings: Settings.isolated(),
      statusLine,
      ui,
      eventBus: undefined,
      subagentEventBus: undefined,
      collabHost: undefined,
      showStatus: (_message: string, _options?: unknown) => {},
      updatePendingMessagesDisplay: () => {},
    } as unknown as InteractiveModeContext;

    const host = new CollabHost(context, {
      access: "control",
      guestActionsReady: () => !agent.isSessionTransitioning,
    });

    try {
      await host.start(DEFAULT_RELAY_URL);
      this.collabHosts.set(sessionId, host);

      return {
        webUrl: host.webLink,
        viewUrl: host.webViewLink,
        instanceId: host.instanceId,
      };
    } catch {
      await host.stop("MCP Collab startup failed").catch(() => {});
      return undefined;
    }
  }
}

export const sdkSessionManager = new OmpSdkSessionManager();
