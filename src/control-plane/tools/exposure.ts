import { eq } from "drizzle-orm";
import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "../db";
import { toolConfigs } from "../db/schema";

const subscriptions = new Set<(name: string, exposed: boolean) => void>();

export function subscribeToolExposure(callback: (name: string, exposed: boolean) => void) {
  subscriptions.add(callback);
  return () => subscriptions.delete(callback);
}

export function notifyToolExposure(name: string, exposed: boolean) {
  for (const callback of subscriptions) callback(name, exposed);
}

export function ensureToolConfig(name: string) {
  const timestamp = new Date().toISOString();
  db.insert(toolConfigs)
    .values({ toolName: name, exposed: true, createdAt: timestamp, updatedAt: timestamp })
    .onConflictDoNothing({ target: toolConfigs.toolName })
    .run();
}

export function isToolExposed(name: string) {
  ensureToolConfig(name);
  return db.select({ exposed: toolConfigs.exposed })
    .from(toolConfigs)
    .where(eq(toolConfigs.toolName, name))
    .get()?.exposed === true;
}

export function setToolExposed(name: string, exposed: boolean) {
  const timestamp = new Date().toISOString();
  db.insert(toolConfigs)
    .values({ toolName: name, exposed, createdAt: timestamp, updatedAt: timestamp })
    .onConflictDoUpdate({
      target: toolConfigs.toolName,
      set: { exposed, updatedAt: timestamp },
    })
    .run();
  notifyToolExposure(name, exposed);
}

export type ToolExposureHandle = {
  name: string;
  registered: RegisteredTool;
};
