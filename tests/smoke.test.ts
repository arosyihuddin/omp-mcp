import { describe, expect, test } from "bun:test";
import { createServer } from "../src/mcp/server";

describe("OMP MCP server", () => {
  test("creates an MCP server", () => {
    expect(createServer()).toBeDefined();
  });
});
