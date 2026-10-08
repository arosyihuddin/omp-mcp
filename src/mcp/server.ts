import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sdkSessionManager } from "../omp/sdk-session";
import "../control-plane/db";
import { registerTools } from "./tools";

export async function createServer() {
  const server = new McpServer({ name: "omp-mcp-server", version: "0.1.0" });
  await registerTools(server, sdkSessionManager);
  return server;
}
