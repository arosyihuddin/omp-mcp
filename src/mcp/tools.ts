import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { OmpSdkSessionManager } from "../omp/sdk-session";
import { config } from "../lib/config";
import { logger } from "../lib/logger";
import { nativeRuntime } from "../omp/native";
import { jsonSchemaToZod } from "./json-schema";

function result(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

export async function registerTools(server: McpServer, manager: OmpSdkSessionManager) {
  server.registerTool("omp_run", {
    description: "Start an OMP coding-agent session. Optionally select a specific model.",
    inputSchema: {
      task: z.string().min(1),
      cwd: z.string().min(1).optional(),
      model: z.string().min(1).optional(),
    },
  }, async ({ task, cwd, model }) => {
    logger.info({ tool: "omp_run", cwd, model }, "Starting OMP session");
    try {
      const session = await manager.start(task, cwd ?? config.ompDefaultCwd, model);

      logger.info({ tool: "omp_run", sessionId: session.sessionId, status: session.status }, "OMP session started");
      return result(session);
    } catch (error) {
      logger.error({ err: error, tool: "omp_run" }, "Failed to start OMP session");
      return errorResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.registerTool("omp_collab", {
  description: "Get the browser collaboration links for an OMP session.",
  inputSchema: {
    session_id: z.string().min(1),
  },
}, async ({ session_id }) => {
    const collab = manager.getCollab(session_id);
    return collab
      ? result({ session_id, collab })
      : errorResult(`No active Collab host for session: ${session_id}`);
  });

  server.registerTool("omp_status", {
    description: "Get the current status and metadata for an OMP session.",
    inputSchema: { session_id: z.string().min(1) },
  }, async ({ session_id }) => {
    const session = manager.get(session_id);
    return session ? result(session) : errorResult(`Unknown session: ${session_id}`);
  });

  server.registerTool("omp_result", {
    description: "Get the latest result and metadata for an OMP session.",
    inputSchema: { session_id: z.string().min(1) },
  }, async ({ session_id }) => {
    const session = manager.get(session_id);
    if (!session) return errorResult(`Unknown session: ${session_id}`);
    return result({
      session_id: session.sessionId,
      status: session.status,
      result: session.result,
      error: session.error,
    });
  });

  server.registerTool("omp_resume", {
    description: "Resume an existing OMP session with an additional instruction.",
    inputSchema: {
      session_id: z.string().min(1),
      task: z.string().min(1),
    },
  }, async ({ session_id, task }) => {
    try {
      return result(await manager.resume(session_id, task));
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : String(error));
    }
  });

  server.registerTool("omp_interrupt", {
    description: "Interrupt a running OMP session.",
    inputSchema: { session_id: z.string().min(1) },
  }, async ({ session_id }) => {
    const ok = await manager.interrupt(session_id);
    return ok
      ? result({ session_id, status: "interrupted" })
      : errorResult(`No running session: ${session_id}`);
  });

  server.registerTool("omp_dispose", {
    description: "Dispose an OMP session and remove it from the MCP server.",
    inputSchema: { session_id: z.string().min(1) },
  }, async ({ session_id }) => {
    if (!manager.get(session_id)) {
      return errorResult(`Unknown session: ${session_id}`);
    }

    await manager.dispose(session_id);
    return result({ session_id, disposed: true });
  });

  server.registerTool("omp_list", {
    description: "List OMP sessions managed by this MCP server.",
    inputSchema: {
      status: z.enum(["all", "starting", "running", "completed", "failed", "interrupted"]).optional().default("all"),
    },
  }, async ({ status }) => {
    const sessions = manager.list().filter((session) => status === "all" || session.status === status);
    return result({ sessions });
  });

  const nativeTools = await nativeRuntime.list(config.ompDefaultCwd);
  for (const nativeTool of nativeTools) {
    if (nativeTool.name.startsWith("omp_")) continue;

    server.registerTool(nativeTool.name, {
      description: nativeTool.description,
      inputSchema: jsonSchemaToZod(nativeTool.inputSchema),
    }, async (args) => {
      try {
        const value = await nativeTool.execute(args as Record<string, unknown>);
        if (value && typeof value === "object" && Array.isArray((value as any).content)) {
          return value as any;
        }
        return result(value);
      } catch (error) {
        logger.error({ err: error, tool: nativeTool.name }, "Native OMP tool failed");
        return errorResult(error instanceof Error ? error.message : String(error));
      }
    });
  }

  logger.info(
    { count: nativeTools.length, tools: nativeTools.map((tool) => tool.name) },
    "Registered native OMP tools",
  );
}
