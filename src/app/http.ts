import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createServer } from "../mcp/server";
import { logger } from "../lib/logger";

interface HttpSession {
  server: McpServer;
  transport: WebStandardStreamableHTTPServerTransport;
}

const sessions = new Map<string, HttpSession>();

export async function handleMcpHttpRequest(request: Request): Promise<Response> {
  const sessionId = request.headers.get("mcp-session-id");

  if (sessionId) {
    const session = sessions.get(sessionId);

    if (!session) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Unknown MCP session",
          },
          id: null,
        }),
        {
          status: 404,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }

    return session.transport.handleRequest(request);
  }

  if (request.method === "GET" || request.method === "DELETE") {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "MCP session ID is required",
        },
        id: null,
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }

  let sessionIdForCleanup: string | undefined;

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (id) => {
      sessionIdForCleanup = id;
    },
    onsessionclosed: (id) => {
      sessions.delete(id);
    },
  });

  const server = await createServer();

  transport.onclose = () => {
    if (sessionIdForCleanup) {
      sessions.delete(sessionIdForCleanup);
    }
  };

  await server.connect(transport);

  const response = await transport.handleRequest(request);

  if (sessionIdForCleanup) {
    sessions.set(sessionIdForCleanup, { server, transport });
  }

  return response;
}

export async function closeMcpHttpSessions(): Promise<void> {
  const currentSessions = [...sessions.entries()];
  sessions.clear();

  await Promise.allSettled(
    currentSessions.map(async ([sessionId, { server, transport }]) => {
      await transport.close();
      await server.close();
      logger.info({ sessionId }, "MCP HTTP session disposed");
    }),
  );
}
