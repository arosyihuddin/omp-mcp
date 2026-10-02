import { mkdir } from "node:fs/promises";
import { logger } from "./lib/logger";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { createServer } from "./mcp/server";
import { handleMcpHttpRequest, closeMcpHttpSessions } from "./http";
import { config } from "./lib/config";

let server: Awaited<ReturnType<typeof createServer>> | undefined;
let httpServer: ReturnType<typeof Bun.serve> | undefined;

await mkdir(config.ompDefaultCwd, { recursive: true });

if (config.transport === "stdio" || config.transport === "both") {
  server = await createServer();
  logger.info({ transport: "stdio" }, "OMP MCP server starting");

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info({ transport: "stdio" }, "OMP MCP server connected");
}

if (config.transport === "http" || config.transport === "both") {
  httpServer = Bun.serve({
    hostname: config.httpHost,
    port: config.httpPort,
    fetch(request) {
      const url = new URL(request.url);

      if (url.pathname !== config.httpPath) {
        return new Response("Not Found", { status: 404 });
      }

      return handleMcpHttpRequest(request);
    },
  });

  logger.info(
    {
      transport: "streamable-http",
      url: `http://${config.httpHost}:${httpServer.port}${config.httpPath}`,
    },
    "OMP MCP Streamable HTTP server listening",
  );
}

const shutdown = async (signal: string) => {
  logger.info({ signal }, "OMP MCP server shutting down");

  httpServer?.stop();
  await closeMcpHttpSessions();
  await server?.close();
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
