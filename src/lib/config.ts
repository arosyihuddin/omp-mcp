const transport = process.env.MCP_TRANSPORT ?? "stdio";

if (transport !== "stdio" && transport !== "http" && transport !== "both") {
  throw new Error(`Invalid MCP_TRANSPORT: ${transport}. Expected stdio, http, or both.`);
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  logLevel: process.env.LOG_LEVEL ?? "info",
  ompDefaultModel: process.env.OMP_DEFAULT_MODEL ?? "onedoor/combo-deepseek-v4-flash",
  ompDefaultCwd: process.env.OMP_DEFAULT_CWD ?? process.cwd(),
  transport,
  httpHost: process.env.MCP_HTTP_HOST ?? "127.0.0.1",
  httpPort: Number(process.env.MCP_HTTP_PORT ?? "3000"),
  httpPath: process.env.MCP_HTTP_PATH ?? "/mcp",
} as const;
