import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { OmpSdkSessionManager } from "../../omp/sdk-session";
import { config } from "../../lib/config";
import { logger } from "../../lib/logger";
import { nativeRuntime } from "../../omp/native";
import { jsonSchemaToZod } from "../json-schema";
import { getApprovalDecisionMessage, requestApproval } from "../../approval";
import { errorMessage, errorResult, logValue, result } from "./shared";

let nativeToolsLogged = false;

function getNativeToolDescription(tool: { name: string; description: string }) {
  if (tool.name !== "eval") return tool.description;
  return [
    tool.description, "",
    "Browser automation: JavaScript Eval exposes the global `browser` API.",
    "Use `await browser.open(...)` before `browser.tabs()` or direct tab interaction; `browser.tabs()` lists only tabs currently managed by OMP.",
    'For an existing Chrome/Brave tab through Browser Relay, use `await browser.open({ name: "current", app: { relay: true } })` to adopt the visible tab, or add `app.target` to select a tab by URL/title substring.',
    'Example: `const tab = await browser.open({ name: "current", app: { relay: true } }); return { url: await tab.url(), title: await tab.title() };`',
    "Relay requires the OMP Browser Relay server and browser extension to be connected. Relay actions operate on the user's real logged-in browser session.",
    "Common tab APIs include url, title, goto, observe, ariaSnapshot, screenshot, click, fill, type, press, waitForSelector, extract, text, html, evaluate, and run.",
  ].join("\\n");
}

export function getNativeToolAnnotations(name: string) {
  if (["read", "glob", "grep", "find", "ast_grep", "web_search"].includes(name)) {
    return { readOnlyHint: true, openWorldHint: name === "web_search" };
  }
  if (["lsp", "todo", "new_context"].includes(name)) {
    return { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  }
  if (["write", "edit", "ast_edit", "context_notes", "learn", "manage_skill", "task", "debug", "bash", "eval"].includes(name)) {
    return { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: name === "bash" || name === "eval" };
  }
  return { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true };
}

export async function registerOmpTools(server: McpServer, manager: OmpSdkSessionManager) {
  server.registerTool("omp_run", {
    description: "Start an OMP coding-agent session. Optionally select a specific model.",
    inputSchema: { task: z.string().min(1), cwd: z.string().min(1).optional(), model: z.string().min(1).optional() },
  }, async ({ task, cwd, model }) => {
    logger.info({ tool: "omp_run", cwd, model }, "Starting OMP session");
    try {
      const session = await manager.start(task, cwd ?? config.ompDefaultCwd, model);
      logger.info({ tool: "omp_run", sessionId: session.sessionId, status: session.status }, "OMP session started");
      return result(session);
    } catch (error) {
      logger.error({ err: error, tool: "omp_run" }, "Failed to start OMP session");
      return errorResult(errorMessage(error));
    }
  });

  server.registerTool("omp_collab", {
    description: "Get the browser collaboration links for an OMP session.", inputSchema: { session_id: z.string().min(1) },
  }, async ({ session_id }) => {
    logger.debug({ tool: "omp_collab", sessionId: session_id }, "MCP tool call");
    const collab = manager.getCollab(session_id);
    return collab ? result({ session_id, collab }) : errorResult(`No active Collab host for session: ${session_id}`);
  });

  server.registerTool("omp_status", {
    description: "Get the current status and metadata for an OMP session.", inputSchema: { session_id: z.string().min(1) },
  }, async ({ session_id }) => {
    logger.debug({ tool: "omp_status", sessionId: session_id }, "MCP tool call");
    const session = manager.get(session_id);
    return session ? result(session) : errorResult(`Unknown session: ${session_id}`);
  });

  server.registerTool("omp_result", {
    description: "Get the latest result and metadata for an OMP session.", inputSchema: { session_id: z.string().min(1) },
  }, async ({ session_id }) => {
    logger.debug({ tool: "omp_result", sessionId: session_id }, "MCP tool call");
    const session = manager.get(session_id);
    if (!session) return errorResult(`Unknown session: ${session_id}`);
    return result({ session_id: session.sessionId, status: session.status, result: session.result, error: session.error });
  });

  server.registerTool("omp_resume", {
    description: "Resume an existing OMP session with an additional instruction.", inputSchema: { session_id: z.string().min(1), task: z.string().min(1) },
  }, async ({ session_id, task }) => {
    logger.debug({ tool: "omp_resume", sessionId: session_id }, "MCP tool call");
    try { return result(await manager.resume(session_id, task)); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("omp_interrupt", {
    description: "Interrupt a running OMP session.", inputSchema: { session_id: z.string().min(1) },
  }, async ({ session_id }) => {
    logger.debug({ tool: "omp_interrupt", sessionId: session_id }, "MCP tool call");
    const ok = await manager.interrupt(session_id);
    return ok ? result({ session_id, status: "interrupted" }) : errorResult(`No running session: ${session_id}`);
  });

  server.registerTool("omp_dispose", {
    description: "Dispose an OMP session and remove it from the MCP server.", inputSchema: { session_id: z.string().min(1) },
  }, async ({ session_id }) => {
    logger.debug({ tool: "omp_dispose", sessionId: session_id }, "MCP tool call");
    if (!manager.get(session_id)) return errorResult(`Unknown session: ${session_id}`);
    await manager.dispose(session_id);
    return result({ session_id, disposed: true });
  });

  server.registerTool("omp_list", {
    description: "List OMP sessions managed by this MCP server.",
    inputSchema: { status: z.enum(["all", "starting", "running", "completed", "failed", "interrupted"]).optional().default("all") },
  }, async ({ status }) => {
    logger.debug({ tool: "omp_list", status }, "MCP tool call");
    return result({ sessions: manager.list().filter((session) => status === "all" || session.status === status) });
  });

  const nativeTools = await nativeRuntime.list(config.ompDefaultCwd);
  for (const nativeTool of nativeTools) {
    if (nativeTool.name.startsWith("omp_")) continue;
    server.registerTool(nativeTool.name, {
      description: getNativeToolDescription(nativeTool), inputSchema: jsonSchemaToZod(nativeTool.inputSchema), annotations: getNativeToolAnnotations(nativeTool.name),
    }, async (args, extra) => {
      const startedAt = performance.now();
      const toolArgs = args as Record<string, unknown>;
      logger.debug({ tool: nativeTool.name, args: toolArgs }, "MCP tool call");
      try {
        const annotations = getNativeToolAnnotations(nativeTool.name);
        if (!annotations.readOnlyHint) {
          const decision = await requestApproval({
            tool: nativeTool.name,
            args: toolArgs,
            risk: annotations.openWorldHint ? "high" : "medium",
            sessionId: extra.sessionId,
            requestId: extra.requestId,
            signal: extra.signal,
            reason: annotations.openWorldHint ? "This operation can affect external systems." : "This operation can modify state on the host.",
          });
          if (!decision.approved) return errorResult(getApprovalDecisionMessage(decision.status));
        }

        const value = await nativeTool.execute(toolArgs, extra.signal);
        logger.debug({ tool: nativeTool.name, durationMs: Math.round(performance.now() - startedAt), result: logValue(value) }, "MCP tool call completed");
        if (value && typeof value === "object" && Array.isArray((value as Record<string, unknown>).content)) return value as CallToolResult;
        return result(value);
      } catch (error) {
        logger.error({ err: error, tool: nativeTool.name, durationMs: Math.round(performance.now() - startedAt) }, "MCP tool call failed");
        return errorResult(errorMessage(error));
      }
    });
  }

  if (!nativeToolsLogged) {
    nativeToolsLogged = true;
    logger.info({ count: nativeTools.length, tools: nativeTools.map((tool) => tool.name) }, "Registered native OMP tools");
  }
}
