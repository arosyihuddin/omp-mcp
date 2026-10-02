import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";

const root = new URL("../", import.meta.url).pathname;
const port = 3101;
const endpoint = `http://127.0.0.1:${port}/mcp`;

let serverProcess: ReturnType<typeof Bun.spawn>;

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
    name: "omp-mcp-test-client",
    version: "0.1.0",
  });

  const transport = new StreamableHTTPClientTransport(new URL(endpoint));
  await client.connect(transport);

  return { client, transport };
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

describe("MCP Streamable HTTP integration", () => {
  test("initializes and exposes OMP tools", async () => {
    const { client, transport } = await createClient();

    try {
      const result = await client.listTools();
      const names = result.tools.map((tool) => tool.name);

      expect(names).toContain("omp_run");
      expect(names).toContain("omp_status");
      expect(names).toContain("omp_result");
      expect(names).toContain("omp_resume");
      expect(names).toContain("omp_interrupt");
      expect(names).toContain("omp_dispose");
      expect(names).toContain("omp_list");
      expect(names).toContain("omp_collab");
      expect(names).toContain("read");
      expect(names).toContain("bash");
      expect(names).toContain("write");
      expect(names).not.toContain("omp_read");
    } finally {
      await transport.close();
    }
  }, 30_000);

  test("executes a native OMP tool without an OMP agent", async () => {
    const { client, transport } = await createClient();

    try {
      const result = await client.callTool({
        name: "read",
        arguments: { path: "package.json" },
      });

      expect(result.isError).not.toBe(true);
      const content = result.content as Array<{ type: string; text?: string }> | undefined;
      expect(content?.some((item) => item.type === "text" && item.text?.includes("omp-mcp"))).toBe(true);
    } finally {
      await transport.close();
    }
  }, 30_000);

  test("runs an OMP task through the MCP tool", async () => {
    const { client, transport } = await createClient();

    try {
      const result = await client.callTool({
        name: "omp_run",
        arguments: {
          task: "Respond with exactly: MCP_E2E_OK",
          cwd: root,
        },
      });

      expect(result.isError).not.toBe(true);
      const content = result.content as Array<{ type: string; text?: string }> | undefined;
      const text = content?.find((item) => item.type === "text");
      expect(text?.type).toBe("text");
      if (text?.type !== "text") throw new Error("MCP tool returned no text content");

      const session = JSON.parse(text.text!) as {
        sessionId: string;
        status: string;
      };

      expect(session.sessionId).toMatch(/^sdk-/);
      expect(["starting", "running", "completed"]).toContain(session.status);

      let finalStatus = session.status;
      for (let i = 0; i < 60 && finalStatus !== "completed" && finalStatus !== "failed"; i++) {
        await new Promise((resolve) => setTimeout(resolve, 250));

        const statusResult = await client.callTool({
          name: "omp_status",
          arguments: { session_id: session.sessionId },
        });

        const statusContent = statusResult.content as Array<{ type: string; text?: string }> | undefined;
        const statusText = statusContent?.find((item) => item.type === "text");
        if (statusText?.type !== "text") throw new Error("omp_status returned no text content");

        finalStatus = (JSON.parse(statusText.text!) as { status: string }).status;
      }

      expect(finalStatus).toBe("completed");

      const listResponse = await client.callTool({
        name: "omp_list",
        arguments: { status: "all" },
      });
      const listContent = listResponse.content as Array<{ type: string; text?: string }> | undefined;
      const listText = listContent?.find((item) => item.type === "text");
      if (listText?.type !== "text") throw new Error("omp_list returned no text content");

      const listPayload = JSON.parse(listText.text!) as {
        sessions: Array<{ sessionId: string }>;
      };
      expect(listPayload.sessions.some((item) => item.sessionId === session.sessionId)).toBe(true);

      const resultResponse = await client.callTool({
        name: "omp_result",
        arguments: { session_id: session.sessionId },
      });
      const resultContent = resultResponse.content as Array<{ type: string; text?: string }> | undefined;
      const resultText = resultContent?.find((item) => item.type === "text");
      if (resultText?.type !== "text") throw new Error("omp_result returned no text content");

      const payload = JSON.parse(resultText.text!) as {
        status: string;
        result?: string;
      };
      expect(payload.status).toBe("completed");
      expect(payload.result).toContain("MCP_E2E_OK");
    } finally {
      await transport.close();
    }
  }, 60_000);
});
