import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AnySchema, ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ensureToolConfig, isToolExposed, subscribeToolExposure } from "../../control-plane/tools/exposure";
import { recordToolCallLog } from "../../control-plane/logs";
const handles = new WeakMap<McpServer, Map<string, RegisteredTool>>();
const subscribedServers = new WeakSet<McpServer>();

function ensureServerSubscription(server: McpServer) {
  if (subscribedServers.has(server)) return;
  subscribedServers.add(server);
  const serverHandles = new Map<string, RegisteredTool>();
  handles.set(server, serverHandles);
  subscribeToolExposure((name, exposed) => {
    const tool = serverHandles.get(name);
    if (!tool) return;
    if (exposed) tool.update({ name, enabled: true });
    else tool.update({ name: null, enabled: false });
  });
}

type ToolDefinition<OutputArgs extends ZodRawShapeCompat | AnySchema, InputArgs extends undefined | ZodRawShapeCompat | AnySchema> = {
  title?: string;
  description?: string;
  inputSchema?: InputArgs;
  outputSchema?: OutputArgs;
  annotations?: ToolAnnotations;
  _meta?: Record<string, unknown>;
};

export function registerExposedTool<OutputArgs extends ZodRawShapeCompat | AnySchema, InputArgs extends undefined | ZodRawShapeCompat | AnySchema = undefined>(
  server: McpServer,
  name: string,
  definition: ToolDefinition<OutputArgs, InputArgs>,
  handler: ToolCallback<InputArgs>,
): RegisteredTool {
  ensureServerSubscription(server);
  ensureToolConfig(name);
  type GenericExtra = Parameters<ToolCallback<ZodRawShapeCompat>>[1];
  type GenericHandler = (...args: unknown[]) => ReturnType<ToolCallback<ZodRawShapeCompat>>;
  const genericHandler = handler as unknown as GenericHandler;
  const wrappedHandler = async (...callbackArgs: unknown[]) => {
    const hasArgs = callbackArgs.length === 2;
    const args = hasArgs ? callbackArgs[0] : undefined;
    const extra = (hasArgs ? callbackArgs[1] : callbackArgs[0]) as GenericExtra;
    const startedAt = performance.now();
    let serializedArgs = "{}";
    try { serializedArgs = JSON.stringify(args); } catch { serializedArgs = String(args); }
    try {
      const response = hasArgs ? await genericHandler(args, extra) : await genericHandler(extra);
      let serializedResult = "";
      try { serializedResult = JSON.stringify(response.content); } catch { serializedResult = String(response.content); }
      recordToolCallLog({
        timestamp: new Date().toISOString(),
        requestId: String(extra.requestId),
        sessionId: extra.sessionId,
        toolName: name,
        status: response.isError ? "error" : "success",
        approval: null,
        durationMs: Math.round(performance.now() - startedAt),
        arguments: serializedArgs,
        result: serializedResult.length > 20000 ? serializedResult.slice(0, 20000) + "…" : serializedResult,
        error: response.isError ? serializedResult : null,
      });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      recordToolCallLog({
        timestamp: new Date().toISOString(),
        requestId: String(extra.requestId),
        sessionId: extra.sessionId,
        toolName: name,
        status: "error",
        approval: null,
        durationMs: Math.round(performance.now() - startedAt),
        arguments: serializedArgs,
        result: null,
        error: message,
      });
      throw error;
    }
  };
  const tool = server.registerTool(name, definition, wrappedHandler as unknown as ToolCallback<InputArgs>);
  handles.get(server)!.set(name, tool);
  if (!isToolExposed(name)) tool.update({ name: null, enabled: false });
  return tool;
}
