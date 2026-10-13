import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerComputerTools } from "./computer";
import { registerFilesystemTools } from "./filesystem";
import { registerNativeTools } from "./native";
import { registerSystemTools } from "./system";
import { registerTunnelTools } from "./tunnels";

export async function registerTools(server: McpServer) {
  registerSystemTools(server);
  registerComputerTools(server);
  registerFilesystemTools(server);
  await registerNativeTools(server);
  registerTunnelTools(server);
}
