import { registerExposedTool } from "./register";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../../lib/config";
import { logger } from "../../lib/logger";
import { nativeRuntime } from "../../omp/native";
import { jsonSchemaToZod } from "../json-schema";
import { errorMessage, errorResult, logValue, result } from "./shared";
import { getNativeToolAnnotations } from "./native-metadata";

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

export async function registerNativeTools(server: McpServer) {
  const nativeTools = await nativeRuntime.list(config.ompDefaultCwd);
  for (const nativeTool of nativeTools) {
    if (nativeTool.name.startsWith("omp_")) continue;
    registerExposedTool(server, nativeTool.name, {
      description: getNativeToolDescription(nativeTool), inputSchema: jsonSchemaToZod(nativeTool.inputSchema), annotations: getNativeToolAnnotations(nativeTool.name),
    }, async (args, extra) => {
      const startedAt = performance.now();
      const toolArgs = args as Record<string, unknown>;
      logger.debug({ tool: nativeTool.name, args: toolArgs }, "MCP tool call");
      try {
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
