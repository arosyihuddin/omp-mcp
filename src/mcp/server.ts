import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { sdkSessionManager } from "../omp/sdk-session";
import { registerTools } from "./tools";

const manager = sdkSessionManager;

export async function createServer() {
  const server = new McpServer({ name: "omp-mcp-server", version: "0.1.0" });
  await registerTools(server, manager);
  return server;
}

export { manager };
