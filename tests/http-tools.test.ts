import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";

const root = new URL("../", import.meta.url).pathname;
const port = 3102;
const endpoint = `http://127.0.0.1:${port}/mcp`;

let serverProcess: ReturnType<typeof Bun.spawn>;

const sessionTools = [
  "omp_run",
  "omp_status",
  "omp_result",
  "omp_resume",
  "omp_interrupt",
  "omp_dispose",
  "omp_list",
  "omp_collab",
] as const;

const nativeTools = [
  "read",
  "bash",
  "edit",
  "eval",
  "glob",
  "grep",
  "find",
  "context_notes",
  "new_context",
  "task",
  "wait",
  "todo",
  "web_search",
  "write",
  "learn",
  "manage_skill",
  "ast_grep",
  "ast_edit",
  "debug",
  "lsp",
  "checkpoint",
  "rewind",
] as const;

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(endpoint, { method: "GET" });
      if (response.status === 400) return;
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`MCP HTTP server did not start at ${endpoint}`);
}

async function createClient() {
  const client = new Client({
    name: "omp-mcp-http-tools-test",
    version: "0.1.0",
  });

  const transport = new StreamableHTTPClientTransport(new URL(endpoint));
  await client.connect(transport);

  return { client, transport };
}

async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
) {
  return client.callTool({ name, arguments: args });
}

beforeAll(async () => {
  serverProcess = Bun.spawn(["bun", "run", "src/index.ts"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "test",
      MCP_TRANSPORT: "http",
      MCP_HTTP_HOST: "127.0.0.1",
      MCP_HTTP_PORT: String(port),
      MCP_HTTP_PATH: "/mcp",
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  await waitForServer();
});

afterAll(() => {
  serverProcess.kill();
});

describe("MCP Streamable HTTP tool coverage", () => {
  test("exposes every expected MCP and native OMP tool", async () => {
    const { client, transport } = await createClient();

    try {
      const result = await client.listTools();
      const names = new Set(result.tools.map((tool) => tool.name));
      const expected = [...sessionTools, ...nativeTools];

      expect(result.tools).toHaveLength(expected.length);

      for (const name of expected) {
        expect(names.has(name)).toBe(true);
      }

      expect(names.size).toBe(expected.length);
    } finally {
      await transport.close();
    }
  }, 30_000);

  test("executes representative native tools over HTTP", async () => {
    const { client, transport } = await createClient();

    try {
      const read = await callTool(client, "read", { path: "package.json" });
      expect(read.isError).not.toBe(true);

      const readContent = read.content as Array<{ type: string; text?: string }> | undefined;
      expect(readContent?.some((item) => item.text?.includes("omp-mcp"))).toBe(true);

      const glob = await callTool(client, "glob", { path: "*.json" });
      expect(glob.isError).not.toBe(true);

      const bash = await callTool(client, "bash", {
        command: "printf MCP_HTTP_BASH_OK",
        cwd: root,
      });
      expect(bash.isError).not.toBe(true);

      const bashContent = bash.content as Array<{ type: string; text?: string }> | undefined;
      expect(bashContent?.some((item) => item.text?.includes("MCP_HTTP_BASH_OK"))).toBe(true);
    } finally {
      await transport.close();
    }
  }, 30_000);

  test("routes every session-management tool through HTTP", async () => {
    const { client, transport } = await createClient();

    try {
      const invalidSession = "http-tool-coverage-invalid-session";

      const cases: Array<[string, Record<string, unknown>]> = [
        ["omp_status", { session_id: invalidSession }],
        ["omp_result", { session_id: invalidSession }],
        ["omp_resume", { session_id: invalidSession, task: "test" }],
        ["omp_interrupt", { session_id: invalidSession }],
        ["omp_dispose", { session_id: invalidSession }],
        ["omp_collab", { session_id: invalidSession }],
      ];

      for (const [name, args] of cases) {
        const response = await callTool(client, name, args);
        expect(response.isError).toBe(true);
      }

      const listResponse = await callTool(client, "omp_list", { status: "all" });
      expect(listResponse.isError).not.toBe(true);

      const runResponse = await callTool(client, "omp_run", {
        task: "Respond with exactly: HTTP_TOOL_COVERAGE_OK",
        cwd: root,
      });

      expect(runResponse.isError).not.toBe(true);
    } finally {
      await transport.close();
    }
  }, 60_000);

  test("all native tools expose an MCP input schema", async () => {
    const { client, transport } = await createClient();

    try {
      const result = await client.listTools();
      const toolsByName = new Map(result.tools.map((tool) => [tool.name, tool]));

      for (const name of nativeTools) {
        const tool = toolsByName.get(name);
        expect(tool).toBeDefined();
        expect(tool?.inputSchema).toBeDefined();
        expect(tool?.inputSchema.type).toBe("object");
      }
    } finally {
      await transport.close();
    }
  }, 30_000);
});
