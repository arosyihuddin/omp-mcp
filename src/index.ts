import { mkdir } from "node:fs/promises";
import { logger } from "./lib/logger";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./mcp/server";
import { handleMcpHttpRequest, closeMcpHttpSessions } from "./app/http";
import { handleDashboardRequest } from "./dashboard";
import { terminalManager } from "./terminal";
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

      if (url.pathname === config.httpPath) {
        return handleMcpHttpRequest(request);
      }

      if (url.pathname === "/api/terminal/socket" && request.method === "GET") {
        const terminalId = url.searchParams.get("id");
        if (!terminalId || !terminalManager.get(terminalId)) {
          return new Response("Unknown terminal", { status: 404 });
        }
        if (httpServer?.upgrade(request, { data: { terminalId } })) return;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      return handleDashboardRequest(request);
    },
    websocket: {
      open(ws) {
        const terminalId = (ws.data as { terminalId: string }).terminalId;
        terminalManager.attach(ws as Bun.ServerWebSocket<{ terminalId: string }>, terminalId);
      },
      message(ws, message) {
        try {
          const payload = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
          const terminalId = (ws.data as { terminalId: string }).terminalId;
          if (payload.type === "input" && typeof payload.data === "string") {
            terminalManager.input(terminalId, payload.data);
          } else if (payload.type === "resize") {
            terminalManager.resize(terminalId, Number(payload.cols), Number(payload.rows));
          }
        } catch {}
      },
      close(ws) {
        terminalManager.detach(ws as Bun.ServerWebSocket<{ terminalId: string }>);
      },
      idleTimeout: 0,
    },
    idleTimeout: 120,
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
