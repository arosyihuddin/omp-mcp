import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  getToolInputFields,
  hasToolInputField,
  registerToolInputSchema,
  validateCustomRuleFields,
} from "../src/control-plane/tools/input-schema";

describe("tool input schema catalog", () => {
  test("extracts fields and types from Zod 4 raw input shapes", () => {
    registerToolInputSchema("schema_test", {
      path: z.string().min(1).optional(),
      mode: z.enum(["fast", "safe"]).default("safe"),
      count: z.number().int(),
      enabled: z.boolean().optional(),
      nested: z.object({ child: z.string() }).optional(),
    });

    expect(getToolInputFields("schema_test")).toEqual([
      { path: "path", type: "string", required: false },
      { path: "mode", type: "enum", required: false, enum: ["fast", "safe"] },
      { path: "count", type: "integer", required: true },
      { path: "enabled", type: "boolean", required: false },
      { path: "nested", type: "object", required: false },
      { path: "nested.child", type: "string", required: false },
    ]);
  });

  test("extracts native runtime JSON Schema without an MCP client session", () => {
    registerToolInputSchema("runtime_schema_test", {
      type: "object",
      properties: {
        path: { type: "string", description: "Path" },
        limit: { type: "integer" },
        recursive: { type: "boolean" },
        mode: { type: "string", enum: ["files", "directories"] },
        options: { type: "object", properties: { hidden: { type: "boolean" } }, required: ["hidden"] },
      },
      required: ["path", "limit"],
    });

    expect(getToolInputFields("runtime_schema_test")).toEqual([
      { path: "path", type: "string", required: true, description: "Path" },
      { path: "limit", type: "integer", required: true },
      { path: "recursive", type: "boolean", required: false },
      { path: "mode", type: "enum", required: false, enum: ["files", "directories"] },
      { path: "options", type: "object", required: false },
      { path: "options.hidden", type: "boolean", required: false },
    ]);
  });

  test("validates argument paths against every affected tool", () => {
    registerToolInputSchema("schema_test_a", { path: z.string() });
    registerToolInputSchema("schema_test_b", { query: z.string() });

    expect(hasToolInputField("schema_test_a", "path")).toBe(true);
    expect(validateCustomRuleFields({ conditions: [{ field: "args.path" }] }, ["schema_test_a"])).toBeNull();
    expect(validateCustomRuleFields({ conditions: [{ field: "args.path" }] }, ["schema_test_a", "schema_test_b"])).toContain("schema_test_b");
  });
});
