import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { OmpSdkSessionManager } from "../../omp/sdk-session";
import { registerComputerTools } from "./computer";
import { registerFilesystemTools } from "./filesystem";
import { registerOmpTools } from "./omp";
import { registerSystemTools } from "./system";

export async function registerTools(server: McpServer, manager: OmpSdkSessionManager) {
  registerSystemTools(server);
  registerComputerTools(server);
  registerFilesystemTools(server);
  await registerOmpTools(server, manager);
}
