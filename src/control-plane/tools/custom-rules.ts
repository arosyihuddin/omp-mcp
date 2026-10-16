export const customRuleActions = ["allow", "require_approval", "block"] as const;
export type CustomRuleAction = typeof customRuleActions[number];
export const customRuleOperators = [
  "equals", "not_equals", "contains", "not_contains", "starts_with", "ends_with",
  "greater_than", "less_than", "exists", "not_exists", "in", "not_in",
] as const;
export type CustomRuleOperator = typeof customRuleOperators[number];
export type CustomRuleCondition = { field: string; operator: CustomRuleOperator; value?: string };
export type CustomPermissionRule = {
  version: 1;
  match: "all" | "any";
  conditions: CustomRuleCondition[];
  action: CustomRuleAction;
  fallbackAction: CustomRuleAction;
};
export type CustomRuleContext = { name: string; risk: string; args: unknown };

const legacyRules: Record<string, CustomPermissionRule> = {
  approval: { version: 1, match: "all", conditions: [], action: "require_approval", fallbackAction: "require_approval" },
  high_risk: { version: 1, match: "all", conditions: [{ field: "tool.risk", operator: "equals", value: "high" }], action: "require_approval", fallbackAction: "allow" },
  block_high_risk: { version: 1, match: "all", conditions: [{ field: "tool.risk", operator: "equals", value: "high" }], action: "block", fallbackAction: "allow" },
};
const validAction = (value: unknown): value is CustomRuleAction => customRuleActions.includes(value as CustomRuleAction);
const validOperator = (value: unknown): value is CustomRuleOperator => customRuleOperators.includes(value as CustomRuleOperator);

export function isCustomPermissionRule(value: unknown): value is CustomPermissionRule {
  if (!value || typeof value !== "object") return false;
  const rule = value as Record<string, unknown>;
  if (rule.version !== 1 || !["all", "any"].includes(String(rule.match)) ||
      !Array.isArray(rule.conditions) || rule.conditions.length > 20 ||
      !validAction(rule.action) || !validAction(rule.fallbackAction)) return false;
  return rule.conditions.every((condition) => {
    if (!condition || typeof condition !== "object") return false;
    const item = condition as Record<string, unknown>;
    if (typeof item.field !== "string" || item.field.length < 1 || item.field.length > 256 || item.field.trim() !== item.field) return false;
    if (item.field !== "tool.name" && item.field !== "tool.risk") {
      if (!item.field.startsWith("args.") || item.field.length <= 5) return false;
      const segments = item.field.slice(5).split(".");
      if (segments.some((segment) => !/^[A-Za-z0-9_$-]+$/.test(segment) || ["__proto__", "prototype", "constructor"].includes(segment))) return false;
    }
    if (!validOperator(item.operator)) return false;
    if (["exists", "not_exists"].includes(item.operator as string)) return item.value === undefined || (typeof item.value === "string" && item.value.length <= 2000);
    return typeof item.value === "string" && item.value.length <= 2000 && item.value.trim().length > 0;
  });
}
export function normalizeCustomPermissionRule(value: unknown): CustomPermissionRule {
  if (typeof value === "string" && legacyRules[value]) return legacyRules[value];
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return legacyRules.approval; }
  }
  if (typeof parsed === "string" && legacyRules[parsed]) return legacyRules[parsed];
  return isCustomPermissionRule(parsed) ? parsed : legacyRules.approval;
}
export function serializeCustomPermissionRule(rule: CustomPermissionRule): string { return JSON.stringify(rule); }

function getPath(context: CustomRuleContext, field: string): unknown {
  if (field === "tool.name") return context.name;
  if (field === "tool.risk") return context.risk;
  if (!field.startsWith("args.")) return undefined;
  return field.slice(5).split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, context.args);
}
function comparable(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function conditionMatches(condition: CustomRuleCondition, context: CustomRuleContext): boolean {
  const actual = getPath(context, condition.field);
  if ((actual === undefined || actual === null) && !["exists", "not_exists"].includes(condition.operator)) return false;
  const left = comparable(actual);
  const right = condition.value ?? "";
  switch (condition.operator) {
    case "exists": return actual !== undefined && actual !== null;
    case "not_exists": return actual === undefined || actual === null;
    case "equals": return left.toLowerCase() === right.toLowerCase();
    case "not_equals": return left.toLowerCase() !== right.toLowerCase();
    case "contains": return left.toLowerCase().includes(right.toLowerCase());
    case "not_contains": return !left.toLowerCase().includes(right.toLowerCase());
    case "starts_with": return left.toLowerCase().startsWith(right.toLowerCase());
    case "ends_with": return left.toLowerCase().endsWith(right.toLowerCase());
    case "greater_than": return Number.isFinite(Number(left)) && Number.isFinite(Number(right)) && Number(left) > Number(right);
    case "less_than": return Number.isFinite(Number(left)) && Number.isFinite(Number(right)) && Number(left) < Number(right);
    case "in": return right.split(",").map((part) => part.trim().toLowerCase()).includes(left.toLowerCase());
    case "not_in": return !right.split(",").map((part) => part.trim().toLowerCase()).includes(left.toLowerCase());
  }
}
export function evaluateCustomPermissionRule(ruleInput: unknown, context: CustomRuleContext): CustomRuleAction {
  const rule = normalizeCustomPermissionRule(ruleInput);
  if (rule.conditions.length === 0) return rule.action;
  const matches = rule.match === "all"
    ? rule.conditions.every((condition) => conditionMatches(condition, context))
    : rule.conditions.some((condition) => conditionMatches(condition, context));
  return matches ? rule.action : rule.fallbackAction;
}
export const legacyCustomRules = Object.keys(legacyRules);
