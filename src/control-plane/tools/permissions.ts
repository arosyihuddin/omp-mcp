import { eq } from "drizzle-orm";
import { db } from "../db";
import { toolConfigs, toolPermissionGroups } from "../db/schema";

export const permissionModes = ["always_allow", "require_approval", "blocked", "custom"] as const;
export type PermissionMode = typeof permissionModes[number];
export type PermissionSection = "read_only" | "edit_delete" | "other";
export const customRules = ["approval", "high_risk", "block_high_risk"] as const;
export type CustomPermissionRule = typeof customRules[number];

export function permissionSectionForRisk(risk: string): PermissionSection {
  if (risk === "low") return "read_only";
  if (risk === "isolated") return "other";
  return "edit_delete";
}

function now() { return new Date().toISOString(); }

export function getSectionPermissions(): Record<PermissionSection, PermissionMode> {
  const rows = db.select().from(toolPermissionGroups).all();
  const values = new Map(rows.map((row) => [row.section, row.permission]));
  return { read_only: validMode(values.get("read_only"), "always_allow"), edit_delete: validMode(values.get("edit_delete"), "require_approval"), other: validMode(values.get("other"), "require_approval") };
}

export function getSectionCustomRules(): Record<PermissionSection, CustomPermissionRule> {
  const rows = db.select().from(toolPermissionGroups).all();
  const values = new Map(rows.map((row) => [row.section, row.customRule]));
  return { read_only: validRule(values.get("read_only")), edit_delete: validRule(values.get("edit_delete")), other: validRule(values.get("other")) };
}

function validRule(value: string | undefined | null): CustomPermissionRule {
  return customRules.includes(value as CustomPermissionRule) ? value as CustomPermissionRule : "approval";
}

function validMode(value: string | undefined | null, fallback: PermissionMode): PermissionMode {
  return permissionModes.includes(value as PermissionMode) ? value as PermissionMode : fallback;
}

export function getToolPermission(name: string, risk: string) {
  const section = permissionSectionForRisk(risk);
  const row = db.select({ permissionOverride: toolConfigs.permissionOverride })
    .from(toolConfigs).where(eq(toolConfigs.toolName, name)).get();
  const override = validMode(row?.permissionOverride, "custom");
  const hasOverride = !!row?.permissionOverride && permissionModes.includes(row.permissionOverride as PermissionMode);
  const sectionPermission = getSectionPermissions()[section];
  const sectionCustomRule = getSectionCustomRules()[section];
  const permission = hasOverride ? override : sectionPermission;
  const ownRule = db.select({ customRule: toolConfigs.customRule }).from(toolConfigs).where(eq(toolConfigs.toolName, name)).get()?.customRule;
  const customRule = hasOverride && override === "custom" ? validRule(ownRule) : sectionCustomRule;
  return { section, permission, permissionOverride: hasOverride ? override : null, sectionPermission, customRule, sectionCustomRule };
}

export function setToolPermission(name: string, permission: PermissionMode | null, customRule?: CustomPermissionRule) {
  const timestamp = now();
  db.insert(toolConfigs).values({ toolName: name, exposed: true, permissionOverride: permission, customRule: customRule ?? "approval", createdAt: timestamp, updatedAt: timestamp })
    .onConflictDoUpdate({ target: toolConfigs.toolName, set: { permissionOverride: permission, ...(customRule ? { customRule } : {}), updatedAt: timestamp } }).run();
}

export function setSectionPermission(section: PermissionSection, permission: PermissionMode, customRule: CustomPermissionRule = "approval") {
  const timestamp = now();
  db.insert(toolPermissionGroups).values({ section, permission, customRule, updatedAt: timestamp })
    .onConflictDoUpdate({ target: toolPermissionGroups.section, set: { permission, customRule, updatedAt: timestamp } }).run();
}

export function resetSectionToolOverrides(section: PermissionSection, tools: Array<{ name: string; risk: string }>) {
  const timestamp = now();
  for (const tool of tools) {
    if (permissionSectionForRisk(tool.risk) !== section) continue;
    db.update(toolConfigs).set({ permissionOverride: null, updatedAt: timestamp }).where(eq(toolConfigs.toolName, tool.name)).run();
  }
}
