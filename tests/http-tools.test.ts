import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";

const root = new URL("../", import.meta.url).pathname;
const port = 3102;
const endpoint = `http://127.0.0.1:${port}/mcp`;

let serverProcess: ReturnType<typeof Bun.spawn>;

const filesystemTools = ["fs_find", "fs_grep"] as const;

const computerTools = [
  "window_list",
  "window_active",
  "window_focus",
  "window_close",
  "window_move",
  "app_list",
  "mouse_move",
  "mouse_click",
  "mouse_drag",
  "mouse_scroll",
  "keyboard_press",
  "keyboard_hotkey",
  "keyboard_type",
  "screenshot",
] as const;

const systemTools = ["system_info", "hardware_info", "capabilities"] as const;
const controlTools = ["sudo_exec"] as const;

const tunnelTools = ["tunnel_list", "tunnel_status", "tunnel_start", "tunnel_stop"] as const;

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
] as const;

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(endpoint, { method: "GET" });
      if (response.status === 401) return;
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

  const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: { headers: { authorization: "Bearer test-omp-token" } },
  });
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
      OMP_API_TOKEN: "test-omp-token",
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
      const expected = [...filesystemTools, ...computerTools, ...systemTools, ...tunnelTools, ...nativeTools, ...controlTools];

      expect(result.tools).toHaveLength(expected.length);

      for (const name of expected) {
        expect(names.has(name)).toBe(true);
      }

      expect(names.size).toBe(expected.length);

      for (const name of ["omp_run", "omp_collab", "omp_status", "omp_result", "omp_resume", "omp_interrupt", "omp_dispose", "omp_list"]) {
        expect(names.has(name)).toBe(false);
      }
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

      const fsFind = await callTool(client, "fs_find", { pattern: "package.json", path: root });
      expect(fsFind.isError).not.toBe(true);

      const fsGrep = await callTool(client, "fs_grep", { pattern: "omp-mcp", path: root, glob: "package.json" });
      expect(fsGrep.isError).not.toBe(true);

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
