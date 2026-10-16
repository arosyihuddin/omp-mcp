import { describe, expect, test } from "bun:test";
import {
  evaluateCustomPermissionRule,
  isCustomPermissionRule,
  normalizeCustomPermissionRule,
  type CustomPermissionRule,
} from "../src/control-plane/tools/custom-rules";

const context = { name: "write", risk: "high", args: { path: "/etc/hosts", content: "hello world", count: 12 } };
const rule = (overrides: Partial<CustomPermissionRule> = {}): CustomPermissionRule => ({
  version: 1,
  match: "all",
  conditions: [{ field: "tool.risk", operator: "equals", value: "high" }],
  action: "block",
  fallbackAction: "allow",
  ...overrides,
});

describe("custom permission rules", () => {
  test("validates rules and restricts fields to tool metadata or arguments", () => {
    expect(isCustomPermissionRule(rule())).toBe(true);
    expect(isCustomPermissionRule(rule({ conditions: [{ field: "process.env", operator: "exists" }] }))).toBe(false);
    expect(isCustomPermissionRule(rule({ conditions: [{ field: "args.", operator: "exists" }] }))).toBe(false);
    expect(isCustomPermissionRule(rule({ conditions: [{ field: "args.__proto__.constructor", operator: "exists" }] }))).toBe(false);
    expect(isCustomPermissionRule(rule({ conditions: [{ field: " args.path ", operator: "exists" }] }))).toBe(false);
    expect(isCustomPermissionRule(rule({ conditions: [{ field: "args.path", operator: "equals", value: " " }] }))).toBe(false);
  });

  test("matches nested argument fields and evaluates action/fallback", () => {
    const custom = rule({ conditions: [{ field: "args.path", operator: "starts_with", value: "/etc" }] });
    expect(evaluateCustomPermissionRule(custom, context)).toBe("block");
    expect(evaluateCustomPermissionRule(custom, { ...context, args: { path: "/tmp/file" } })).toBe("allow");
  });

  test("supports all and any condition matching", () => {
    const conditions = [
      { field: "tool.risk", operator: "equals", value: "high" },
      { field: "args.count", operator: "greater_than", value: "10" },
    ] as const;
    expect(evaluateCustomPermissionRule(rule({ match: "all", conditions: [...conditions] }), context)).toBe("block");
    expect(evaluateCustomPermissionRule(rule({ match: "any", conditions: [...conditions] }), { ...context, risk: "low", args: { count: 2 } })).toBe("allow");
    expect(evaluateCustomPermissionRule(rule({ match: "any", conditions: [...conditions] }), { ...context, risk: "low", args: { count: 12 } })).toBe("block");
  });

  test("supports existence, list, string, and numeric operators", () => {
    const checks = [
      ["args.missing", "not_exists", undefined, true],
      ["args.content", "contains", "WORLD", true],
      ["args.content", "in", "no, hello world, yes", true],
      ["args.count", "less_than", "20", true],
      ["args.count", "greater_than", "20", false],
    ] as const;
    for (const [field, operator, value, expected] of checks) {
      const condition = { field, operator, ...(value === undefined ? {} : { value }) } as CustomPermissionRule["conditions"][number];
      const action = evaluateCustomPermissionRule(rule({ conditions: [condition] }), context);
      expect(action === "block").toBe(expected);
    }
  });

  test("normalizes persisted legacy rule values", () => {
    expect(evaluateCustomPermissionRule(normalizeCustomPermissionRule("high_risk"), context)).toBe("require_approval");
    expect(evaluateCustomPermissionRule(normalizeCustomPermissionRule("high_risk"), { ...context, risk: "low" })).toBe("allow");
    expect(evaluateCustomPermissionRule(normalizeCustomPermissionRule("block_high_risk"), context)).toBe("block");
    expect(evaluateCustomPermissionRule(normalizeCustomPermissionRule(JSON.stringify("high_risk")), context)).toBe("require_approval");
    expect(evaluateCustomPermissionRule(normalizeCustomPermissionRule("approval"), { ...context, risk: "low" })).toBe("require_approval");
  });
});
