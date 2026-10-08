import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { toolCallLogs, type NewToolCallLog, type ToolCallLog } from "../db/schema";
import { emitDashboardEvent } from "../../dashboard/events";

export type ToolCallLogInput = Omit<NewToolCallLog, "id">;

export function recordToolCallLog(input: ToolCallLogInput): ToolCallLog {
  const row = {
    ...input,
    id: crypto.randomUUID(),
  };
  db.insert(toolCallLogs).values(row).run();
  const saved = db.select().from(toolCallLogs).where(eq(toolCallLogs.id, row.id)).get()!;
  emitDashboardEvent({ type: "tool_call.created", data: saved });
  return saved;
}

export function listToolCallLogs(limit = 100): ToolCallLog[] {
  return db.select().from(toolCallLogs).orderBy(desc(toolCallLogs.timestamp)).limit(Math.min(Math.max(limit, 1), 200)).all();
}
