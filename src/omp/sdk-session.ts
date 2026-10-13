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
import { lookup } from "@oh-my-pi/pi-coding-agent/config/registry";
import { config } from "../lib/config";
import { resolveWorkingDirectory } from "../lib/working-directory";
import { emitDashboardEvent } from "../dashboard/events";
import type { OmpSession } from "./types";
import { eq } from "drizzle-orm";
import { db } from "../control-plane/db";
import { ompSessions } from "../control-plane/db/schema";


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
  private readonly disposedSessions = new Set<string>();
  private readonly releasing = new Map<string, Promise<void>>();
  constructor() {
    for (const row of db.select().from(ompSessions).all()) {
      try {
        const session = JSON.parse(row.data) as OmpSession;
        if (session.status === "starting" || session.status === "running") {
          session.status = "interrupted";
          session.updatedAt = now();
          this.persist(session);
        }
      } catch (error) {
        console.error(`Unable to restore OMP session ${row.sessionId}:`, error);
      }
    }
  }

  private loadSession(sessionId: string): OmpSession | undefined {
    const active = this.sessions.get(sessionId);
    if (active) return active;
    const row = db.select().from(ompSessions).where(eq(ompSessions.sessionId, sessionId)).get();
    if (!row) return undefined;
    try {
      return JSON.parse(row.data) as OmpSession;
    } catch (error) {
      console.error(`Unable to load OMP session ${sessionId}:`, error);
      return undefined;
    }
  }

  private publicSession(session: OmpSession): OmpSession {
    const { sdkSessionFile: _sdkSessionFile, ...visible } = session;
    return visible;
  }

  private persist(session: OmpSession) {
    db.insert(ompSessions).values({
      sessionId: session.sessionId,
      cwd: session.cwd,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      data: JSON.stringify(session),
    }).onConflictDoUpdate({
      target: ompSessions.sessionId,
      set: {
        cwd: session.cwd,
        status: session.status,
        updatedAt: session.updatedAt,
        data: JSON.stringify(session),
      },
    }).run();
  }

  get(sessionId: string) {
    const session = this.loadSession(sessionId);
    return session ? this.publicSession(session) : undefined;
  }

  list() {
    const sessions = new Map<string, OmpSession>();
    for (const row of db.select().from(ompSessions).all()) {
      try {
        sessions.set(row.sessionId, JSON.parse(row.data) as OmpSession);
      } catch (error) {
        console.error(`Unable to list OMP session ${row.sessionId}:`, error);
      }
    }
    for (const [sessionId, session] of this.sessions) sessions.set(sessionId, session);
    return [...sessions.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((session) => this.publicSession(session));
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
  async listModels(cwd = config.ompDefaultCwd) {
    const resolvedCwd = await resolveWorkingDirectory(cwd);
    const settings = await Settings.loadReadOnly({ cwd: resolvedCwd });
    const authStorage = await discoverAuthStorage();
    const modelRegistry = new ModelRegistry(authStorage, undefined, { settings });
    await modelRegistry.refresh();
    const models = modelRegistry.getAvailable().map((model) => ({
      id: `${model.provider}/${model.id}`,
      name: model.name,
      provider: model.provider,
      contextWindow: model.contextWindow,
    })).sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name));
    return { models, defaultModel: settings.getModelRole("default") ?? null };
  }

  async start(task: string, cwd: string, modelName?: string): Promise<OmpSession> {
    cwd = await resolveWorkingDirectory(cwd);
    const selectedModel = modelName?.trim() || undefined;
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
      messages: [{ id: crypto.randomUUID(), role: "user", content: task, createdAt: now() }, { id: crypto.randomUUID(), role: "assistant", content: "", createdAt: now() }],
    };

    const agent = await this.createAgent(session, SessionManager.create(cwd));
    if (!session.model && agent.model) session.model = `${agent.model.provider}/${agent.model.id}`;
    session.sdkSessionFile = agent.sessionManager.getSessionFile();
    await agent.sessionManager.ensureOnDisk();

    this.sessions.set(sessionId, session);
    this.agents.set(sessionId, agent);
    this.persist(session);
    emitDashboardEvent({ type: "session.created", data: this.publicSession(session) });

    const collab = await this.startCollab(sessionId, agent);
    if (collab) {
      session.collab = collab;
      this.persist(session);
      emitDashboardEvent({ type: "session.updated", data: this.publicSession(session) });
    }



    this.attachAgent(sessionId, session, agent);

    this.runPrompt(session, agent, task);
    return this.publicSession(session);
  }

  async resume(sessionId: string, task: string): Promise<OmpSession> {
    const pendingRelease = this.releasing.get(sessionId);
    if (pendingRelease) await pendingRelease;
    const session = this.loadSession(sessionId);
    if (!session) throw new Error(`Unknown OMP session: ${sessionId}`);

    let agent = this.agents.get(sessionId);
    if (!agent) {
      if (!session.sdkSessionFile) {
        throw new Error(`Session ${sessionId} has no saved SDK transcript and cannot be reloaded. Start a new session.`);
      }
      const sessionManager = await SessionManager.open(session.sdkSessionFile, undefined, undefined, {
        initialCwd: session.cwd,
        throwIfMissing: true,
      });
      agent = await this.createAgent(session, sessionManager);
      session.sdkSessionFile = agent.sessionManager.getSessionFile() ?? session.sdkSessionFile;
      this.sessions.set(sessionId, session);
      this.agents.set(sessionId, agent);
      this.attachAgent(sessionId, session, agent);
      const collab = await this.startCollab(sessionId, agent);
      if (collab) session.collab = collab;
    } else if (session.status === "running" || session.status === "starting") {
      throw new Error(`OMP session ${sessionId} is already running`);
    }

    session.status = "running";
    session.result = undefined;
    session.error = undefined;
    session.output = [];
    session.messages.push(
      { id: crypto.randomUUID(), role: "user", content: task, createdAt: now() },
      { id: crypto.randomUUID(), role: "assistant", content: "", createdAt: now() },
    );
    session.updatedAt = now();
    this.persist(session);
    emitDashboardEvent({ type: "session.updated", data: this.publicSession(session) });
    this.runPrompt(session, agent, task);
    return this.publicSession(session);
  }

  async interrupt(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    const agent = this.agents.get(sessionId);

    if (!session || !agent) return false;

    session.status = "interrupted";
    session.updatedAt = now();
    this.persist(session);
    await agent.abort({
      goalReason: "interrupted",
      reason: "MCP interrupt",
    });
    emitDashboardEvent({ type: "session.updated", data: this.publicSession(session) });
    await this.releaseAgent(sessionId);
    return true;
  }

  async dispose(sessionId?: string): Promise<void> {
    const ids = sessionId ? [sessionId] : [...this.agents.keys()];
    await Promise.allSettled(ids.map(async (id) => {
      const pendingRelease = this.releasing.get(id);
      if (pendingRelease) await pendingRelease;
      this.disposedSessions.add(id);
      const session = this.loadSession(id);

      this.unsubscribers.get(id)?.();
      this.unsubscribers.delete(id);
      const collab = this.collabHosts.get(id);
      this.collabHosts.delete(id);
      if (collab) await collab.stop("MCP session disposed").catch(() => {});

      const agent = this.agents.get(id);
      const sdkSessionFile = session?.sdkSessionFile ?? agent?.sessionManager.getSessionFile();
      if (agent) {
        if (session?.status === "running" || session?.status === "starting") {
          await agent.abort({ goalReason: "interrupted", reason: "MCP session disposed" }).catch(() => {});
        }
        await agent.sessionManager.flush().catch(() => {});
        await agent.dispose().catch((error) => console.error(`Unable to dispose OMP agent ${id}:`, error));
        if (sdkSessionFile) await agent.sessionManager.dropSession(sdkSessionFile).catch(() => {});
      } else if (sdkSessionFile) {
        try {
          const sessionManager = await SessionManager.open(sdkSessionFile, undefined, undefined, {
            initialCwd: session?.cwd,
            throwIfMissing: true,
          });
          await sessionManager.close();
          await sessionManager.dropSession(sdkSessionFile);
        } catch (error) {
          console.warn(`Unable to delete SDK transcript for disposed session ${id}:`, error);
        }
      }

      this.agents.delete(id);
      this.sessions.delete(id);
      db.delete(ompSessions).where(eq(ompSessions.sessionId, id)).run();
      emitDashboardEvent({ type: "session.removed", data: { sessionId: id } });
    }));
  }

  private async createAgent(session: OmpSession, sessionManager: SessionManager): Promise<AgentSession> {
    const selectedModel = session.model;
    const settings = await Settings.loadReadOnly({ cwd: session.cwd });
    const sessionDefaults: Record<string, unknown> = {
      "astGrep.enabled": true,
      "checkpoint.enabled": true,
      "github.enabled": true,
      "security.enabled": true,
      "find.enabled": "on",
      "compaction.experimentalContextManagement": true,
      "autolearn.enabled": true,
      "memory.backend": "local",
    };
    for (const [id, value] of Object.entries(sessionDefaults)) {
      const setting = lookup(id);
      if (setting && !setting.isConfigured(settings)) setting.override(settings, value);
    }

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
      cwd: session.cwd,
      settings,
      model,
      authStorage,
      modelRegistry,
      sessionManager,
      enableMCP: false,
      enableLsp: true,
      skipPythonPreflight: true,
      autoApprove: true,
    });
    return agent;
  }

  private attachAgent(sessionId: string, session: OmpSession, agent: AgentSession) {
    this.sessions.set(sessionId, session);
    this.agents.set(sessionId, agent);
    const unsubscribe = agent.subscribe((event) => {
      if (this.disposedSessions.has(sessionId)) return;
      session.updatedAt = now();
      if (event.type === "agent_start" || event.type === "turn_start") session.status = "running";

      if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
        const delta = event.assistantMessageEvent.delta;
        if (delta) {
          session.output.push(delta);
          let assistant = session.messages.at(-1);
          if (!assistant || assistant.role !== "assistant") {
            assistant = { id: crypto.randomUUID(), role: "assistant", content: "", createdAt: now() };
            session.messages.push(assistant);
          }
          assistant.content += delta;
        }
      }

      if (event.type === "tool_execution_start") {
        const lastMessage = session.messages.at(-1);
        if (lastMessage?.role === "assistant" && !lastMessage.content) session.messages.pop();
        const args = JSON.stringify(event.args ?? {}, null, 2);
        session.messages.push({
          id: event.toolCallId,
          role: "tool",
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          content: args,
          arguments: args,
          status: "running",
          createdAt: now(),
        });
      }

      if (event.type === "tool_execution_end") {
        const toolMessage = [...session.messages].reverse().find(
          (message) => message.role === "tool" && message.toolCallId === event.toolCallId,
        );
        if (toolMessage) {
          const result = event.result as any;
          toolMessage.result = Array.isArray(result?.content)
            ? result.content.filter((part: any) => part?.type === "text").map((part: any) => part.text).join("\n")
            : typeof result === "string" ? result : JSON.stringify(result ?? null, null, 2);
          toolMessage.content = toolMessage.result ?? "";
          toolMessage.isError = Boolean(event.isError || result?.isError);
          toolMessage.status = toolMessage.isError ? "failed" : "completed";
        }
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
        session.result = session.result || agent.getLastAssistantText() || session.output.join("");
        if (session.status !== "failed" && session.status !== "interrupted") session.status = "completed";
      }
      session.sdkSessionFile = agent.sessionManager.getSessionFile() ?? session.sdkSessionFile;
      this.persist(session);
      emitDashboardEvent({ type: "session.updated", data: this.publicSession(session) });
    });
    this.unsubscribers.set(sessionId, unsubscribe);
  }

  private runPrompt(session: OmpSession, agent: AgentSession, task: string) {
    void agent.prompt(task)
      .then(async () => {
        if (this.disposedSessions.has(session.sessionId)) return;
        session.result = agent.getLastAssistantText() || session.result || session.output.join("");
        if (session.status !== "failed" && session.status !== "interrupted") session.status = "completed";
        session.sdkSessionFile = agent.sessionManager.getSessionFile() ?? session.sdkSessionFile;
        session.updatedAt = now();
        this.persist(session);
        emitDashboardEvent({ type: "session.updated", data: this.publicSession(session) });
        await this.releaseAgent(session.sessionId);
      })
      .catch(async (error) => {
        if (this.disposedSessions.has(session.sessionId)) return;
        if (session.status !== "interrupted") {
          session.status = "failed";
          session.error = error instanceof Error ? error.message : String(error);
        }
        session.sdkSessionFile = agent.sessionManager.getSessionFile() ?? session.sdkSessionFile;
        session.updatedAt = now();
        this.persist(session);
        emitDashboardEvent({ type: "session.updated", data: this.publicSession(session) });
        await this.releaseAgent(session.sessionId);
      });
  }

  private async releaseAgent(sessionId: string): Promise<void> {
    const existing = this.releasing.get(sessionId);
    if (existing) return existing;
    const operation = this.releaseAgentInternal(sessionId);
    this.releasing.set(sessionId, operation);
    try {
      await operation;
    } finally {
      if (this.releasing.get(sessionId) === operation) this.releasing.delete(sessionId);
    }
  }

  private async releaseAgentInternal(sessionId: string): Promise<void> {
    const agent = this.agents.get(sessionId);
    if (!agent) return;
    const session = this.sessions.get(sessionId);
    if (session && (session.status === "running" || session.status === "starting")) return;

    if (session) {
      try {
        session.sdkSessionFile = agent.sessionManager.getSessionFile() ?? session.sdkSessionFile;
        await agent.sessionManager.ensureOnDisk();
        await agent.sessionManager.flush();
        session.sdkSessionFile = agent.sessionManager.getSessionFile() ?? session.sdkSessionFile;
        this.persist(session);
      } catch (error) {
        console.error(`Unable to flush OMP session ${sessionId} before releasing its agent:`, error);
      }
    }

    this.unsubscribers.get(sessionId)?.();
    this.unsubscribers.delete(sessionId);
    const collab = this.collabHosts.get(sessionId);
    this.collabHosts.delete(sessionId);
    if (collab) await collab.stop("OMP session agent released from memory").catch(() => {});
    this.agents.delete(sessionId);
    this.sessions.delete(sessionId);
    try {
      await agent.dispose();
    } catch (error) {
      console.error(`Unable to dispose OMP agent ${sessionId}:`, error);
    }
    if (session?.collab) {
      session.collab = undefined;
      this.persist(session);
      emitDashboardEvent({ type: "session.updated", data: this.publicSession(session) });
    }
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
