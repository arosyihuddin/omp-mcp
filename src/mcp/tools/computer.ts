import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { takeScreenshot, mouseMove, mouseClick, mouseDrag, mouseScroll, keyPress, typeText } from "../../computer";
import { errorMessage, errorResult, result } from "./shared";

const input = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false } as const;
const screenshotOutput = { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;

export function registerComputerTools(server: McpServer) {
  server.registerTool("mouse_move", {
    description: "Move the mouse pointer to absolute screen coordinates.",
    inputSchema: { x: z.number().finite(), y: z.number().finite() }, annotations: { ...input, idempotentHint: true },
  }, async ({ x, y }) => {
    try { await mouseMove(x, y); return result({ ok: true, action: "mouse_move", x, y }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("mouse_click", {
    description: "Click the mouse at screen coordinates. Defaults to left click.",
    inputSchema: {
      x: z.number().finite(), y: z.number().finite(),
      button: z.enum(["left", "right", "middle", "back", "forward"]).optional().default("left"),
      clicks: z.number().int().min(1).max(10).optional().default(1),
    }, annotations: input,
  }, async ({ x, y, button, clicks }) => {
    try { await mouseClick(button, clicks, x, y); return result({ ok: true, action: "mouse_click", x, y, button, clicks }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("mouse_drag", {
    description: "Drag the left mouse button from one screen coordinate to another.",
    inputSchema: { from_x: z.number().finite(), from_y: z.number().finite(), to_x: z.number().finite(), to_y: z.number().finite() },
    annotations: input,
  }, async ({ from_x, from_y, to_x, to_y }) => {
    try { await mouseDrag(from_x, from_y, to_x, to_y); return result({ ok: true, action: "mouse_drag", from_x, from_y, to_x, to_y }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("mouse_scroll", {
    description: "Scroll the mouse wheel. Positive or negative values control direction.",
    inputSchema: { dx: z.number().finite().optional().default(0), dy: z.number().finite().optional().default(0) },
    annotations: { ...input, idempotentHint: true },
  }, async ({ dx, dy }) => {
    try { await mouseScroll(dx, dy); return result({ ok: true, action: "mouse_scroll", dx, dy }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("keyboard_press", {
    description: "Press and release a keyboard key, or a key combination such as Ctrl+C.",
    inputSchema: { keys: z.array(z.string().min(1)).min(1).max(10) }, annotations: input,
  }, async ({ keys }) => {
    try { await keyPress(keys); return result({ ok: true, action: "keyboard_press", keys }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("keyboard_hotkey", {
    description: "Press a keyboard shortcut using the supplied modifier/key sequence.",
    inputSchema: { keys: z.array(z.string().min(1)).min(2).max(10) }, annotations: input,
  }, async ({ keys }) => {
    try { await keyPress(keys); return result({ ok: true, action: "keyboard_hotkey", keys }); }
    catch (error) { return errorResult(errorMessage(error)); }
  });

  server.registerTool("keyboard_type", {
    description: "Type literal text into the currently focused application.",
    inputSchema: { text: z.string().max(10000) }, annotations: input,
  }, async ({ text }) => {
    try { await typeText(text); return result({ ok: true, action: "keyboard_type", length: text.length }); }
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
