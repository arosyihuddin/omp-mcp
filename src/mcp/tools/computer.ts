import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { takeScreenshot, listWindows, activeWindow, focusWindow, closeWindow, moveWindow, listApps, mouseMove, mouseClick, mouseDrag, mouseScroll, keyPress, typeText } from "../../computer";
import { getApprovalDecisionMessage, requestApproval } from "../../approval";
import { errorMessage, errorResult, result } from "./shared";

const input = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false } as const;
const screenshotOutput = { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;

type ApprovalContext = {
  signal: AbortSignal;
  sessionId?: string;
  requestId: string | number;
};

async function requireApproval(tool: string, args: Record<string, unknown>, extra: ApprovalContext, risk: "medium" | "high") {
  const decision = await requestApproval({ tool, args, risk, sessionId: extra.sessionId, requestId: extra.requestId, signal: extra.signal });
  if (!decision.approved) throw new Error(getApprovalDecisionMessage(decision.status));
}

export function registerComputerTools(server: McpServer) {
  server.registerTool("window_list", {
    description: "List currently open desktop windows and their workspace, monitor, application, and focus state.",
    inputSchema: {}, annotations: screenshotOutput,
  }, async () => {
    try { return result({ windows: await listWindows() }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("window_active", {
    description: "Get the desktop window that currently has keyboard focus.",
    inputSchema: {}, annotations: screenshotOutput,
  }, async () => {
    try { return result({ window: await activeWindow() }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("window_focus", {
    description: "Focus a desktop window by its window id.",
    inputSchema: { id: z.string().min(1) }, annotations: input,
  }, async ({ id }, extra) => {
    try { await requireApproval("window_focus", { id }, extra, "medium"); await focusWindow(id); return result({ ok: true, action: "window_focus", id }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });
  server.registerTool("window_close", {
    description: "Close a desktop window by its window id.",
    inputSchema: { id: z.string().min(1) }, annotations: input,
  }, async ({ id }, extra) => {
    try { await requireApproval("window_close", { id }, extra, "medium"); await closeWindow(id); return result({ ok: true, action: "window_close", id }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("window_move", {
    description: "Move a desktop window to a workspace by its window id.",
    inputSchema: { id: z.string().min(1), workspace: z.string().min(1) }, annotations: input,
  }, async ({ id, workspace }, extra) => {
    try { await requireApproval("window_move", { id, workspace }, extra, "medium"); await moveWindow(id, workspace); return result({ ok: true, action: "window_move", id, workspace }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });


  server.registerTool("app_list", {
    description: "List desktop applications available on the operating system. Supports optional search and result limit.",
    inputSchema: {
      query: z.string().optional().describe("Search by application name, id, or executable."),
      limit: z.number().int().min(1).max(100).optional().default(20).describe("Maximum number of applications to return."),
    }, annotations: screenshotOutput,
  }, async ({ query, limit }) => {
    try { return result({ apps: await listApps({ query, limit }) }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("mouse_move", {
    description: "Move the mouse pointer to absolute screen coordinates.",
    inputSchema: { x: z.number(), y: z.number() }, annotations: { ...input, idempotentHint: true },
  }, async ({ x, y }, extra) => {
    try { await requireApproval("mouse_move", { x, y }, extra, "medium"); await mouseMove(x, y); return result({ ok: true, action: "mouse_move", x, y }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("mouse_click", {
    description: "Click the mouse at the current cursor position. Defaults to left click.",
    inputSchema: {
      button: z.enum(["left", "right", "middle", "back", "forward"]).optional().default("left"),
      clicks: z.number().int().min(1).max(10).optional().default(1),
    }, annotations: input,
  }, async ({ button, clicks }, extra) => {
    try { await requireApproval("mouse_click", { button, clicks }, extra, "high"); await mouseClick(button, clicks); return result({ ok: true, action: "mouse_click", button, clicks }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("mouse_drag", {
    description: "Drag the left mouse button from one screen coordinate to another.",
    inputSchema: { from_x: z.number(), from_y: z.number(), to_x: z.number(), to_y: z.number() },
    annotations: input,
  }, async ({ from_x, from_y, to_x, to_y }, extra) => {
    try { await requireApproval("mouse_drag", { from_x, from_y, to_x, to_y }, extra, "high"); await mouseDrag(from_x, from_y, to_x, to_y); return result({ ok: true, action: "mouse_drag", from_x, from_y, to_x, to_y }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("mouse_scroll", {
    description: "Scroll the mouse wheel. Positive or negative values control direction.",
    inputSchema: { dx: z.number().optional().default(0), dy: z.number().optional().default(0) },
    annotations: { ...input, idempotentHint: true },
  }, async ({ dx, dy }, extra) => {
    try { await requireApproval("mouse_scroll", { dx, dy }, extra, "medium"); await mouseScroll(dx, dy); return result({ ok: true, action: "mouse_scroll", dx, dy }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("keyboard_press", {
    description: "Press and release a keyboard key, or a key combination such as Ctrl+C.",
    inputSchema: { keys: z.array(z.string().min(1)).min(1).max(10) }, annotations: input,
  }, async ({ keys }, extra) => {
    try { await requireApproval("keyboard_press", { keys }, extra, "high"); await keyPress(keys); return result({ ok: true, action: "keyboard_press", keys }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("keyboard_hotkey", {
    description: "Press a keyboard shortcut using the supplied modifier/key sequence.",
    inputSchema: { keys: z.array(z.string().min(1)).min(2).max(10) }, annotations: input,
  }, async ({ keys }, extra) => {
    try { await requireApproval("keyboard_hotkey", { keys }, extra, "high"); await keyPress(keys); return result({ ok: true, action: "keyboard_hotkey", keys }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("keyboard_type", {
    description: "Type literal text into the currently focused application.",
    inputSchema: { text: z.string().max(10000) }, annotations: input,
  }, async ({ text }, extra) => {
    try { await requireApproval("keyboard_type", { text }, extra, "high"); await typeText(text); return result({ ok: true, action: "keyboard_type", length: text.length }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("screenshot", {
    description: "Capture the current desktop screen as a PNG. Requires an interactive GUI session.",
    inputSchema: { output_path: z.string().min(1).optional() }, annotations: screenshotOutput,
  }, async ({ output_path }) => {
    try {
      const image = await takeScreenshot(output_path);
      return { content: [
        { type: "text", text: JSON.stringify({ mime_type: image.mime_type, size_bytes: image.size_bytes, path: image.path }) },
        { type: "image", data: image.data_base64, mimeType: image.mime_type },
      ] };
    } catch (error) { return errorResult(errorMessage(error)); }
  });
}
