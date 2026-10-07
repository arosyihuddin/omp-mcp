import { getNativeToolAnnotations } from "./mcp/tools/omp";
import { nativeRuntime } from "./omp/native";
import { config } from "./lib/config";

export type DashboardTool = {
  name: string;
  group: string;
  risk: "low" | "medium" | "high" | "isolated";
  description: string;
};

function riskFromAnnotations(annotations: { readOnlyHint?: boolean; destructiveHint?: boolean; openWorldHint?: boolean }): DashboardTool["risk"] {
  if (annotations.readOnlyHint) return "low";
  if (annotations.destructiveHint) return annotations.openWorldHint ? "high" : "medium";
  return "medium";
}

export async function getDashboardTools(): Promise<DashboardTool[]> {
  const tools: DashboardTool[] = [
    ["system_info", "System", "low", "Get a structured snapshot of the host OS, CPU, memory, GPU, disk, desktop session, display, runtimes, and network interfaces. Read-only."],
    ["hardware_info", "System", "low", "Get CPU, memory, GPU, and root filesystem information. Read-only."],
    ["capabilities", "System", "low", "Detect host capabilities relevant to computer automation. Read-only."],
    ["fs_find", "Filesystem", "low", "Fast filesystem search for files and directories using fd."],
    ["fs_grep", "Filesystem", "low", "Fast recursive content search using ripgrep."],
    ["window_list", "Computer", "low", "List currently open desktop windows."],
    ["window_active", "Computer", "low", "Get the desktop window that currently has keyboard focus."],
    ["window_focus", "Computer", "medium", "Focus a desktop window by its window id."],
    ["window_close", "Computer", "medium", "Close a desktop window by its window id."],
    ["window_move", "Computer", "medium", "Move a desktop window to a workspace by its window id."],
    ["app_list", "Computer", "low", "List desktop applications available on the operating system."],
    ["mouse_move", "Computer", "medium", "Move the mouse pointer to absolute screen coordinates."],
    ["mouse_click", "Computer", "high", "Click the mouse at the current cursor position."],
    ["mouse_drag", "Computer", "high", "Drag the left mouse button from one screen coordinate to another."],
    ["mouse_scroll", "Computer", "medium", "Scroll the mouse wheel."],
    ["keyboard_press", "Computer", "high", "Press and release a keyboard key or key combination."],
    ["keyboard_hotkey", "Computer", "high", "Press a keyboard shortcut."],
    ["keyboard_type", "Computer", "high", "Type literal text into the currently focused application."],
    ["screenshot", "Computer", "low", "Capture the current desktop screen as a PNG."],
    ["omp_run", "OMP Agent", "isolated", "Start an OMP coding-agent session. Separate agent runtime."],
    ["omp_collab", "OMP Agent", "isolated", "Get the browser collaboration links for an OMP session."],
    ["omp_status", "OMP Agent", "isolated", "Get the current status and metadata for an OMP session."],
    ["omp_result", "OMP Agent", "isolated", "Get the latest result and metadata for an OMP session."],
    ["omp_resume", "OMP Agent", "isolated", "Resume an existing OMP session with an additional instruction."],
    ["omp_interrupt", "OMP Agent", "isolated", "Interrupt a running OMP session."],
    ["omp_dispose", "OMP Agent", "isolated", "Dispose an OMP session and remove it from the MCP server."],
    ["omp_list", "OMP Agent", "isolated", "List OMP sessions managed by this MCP server."]
  ].map(([name, group, risk, description]) => ({ name, group, risk: risk as DashboardTool["risk"], description }));

  const nativeTools = await nativeRuntime.list(config.ompDefaultCwd);
  for (const tool of nativeTools) {
    if (tool.name.startsWith("omp_")) continue;
    tools.push({
      name: tool.name,
      group: "Native OMP",
      risk: riskFromAnnotations(getNativeToolAnnotations(tool.name)),
      description: tool.description
    });
  }

  return tools;
}
