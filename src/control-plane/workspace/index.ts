import { userInfo } from "node:os";
import { asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  editorSessions,
  profile,
  workspaceFavorites,
  workspacePins,
  workspacePrefs,
  workspaceRecents,
} from "../db/schema";

const now = () => new Date().toISOString();
const MAX_RECENTS = 20;
const PROFILE_ID = "default";
/** Semantic color tokens the dashboard maps to Tailwind classes (see Avatar.svelte). */
const AVATAR_COLORS = ["accent", "info", "success", "warning", "danger"];

export type EntryType = "file" | "directory";

function assertPath(value: unknown, label = "path"): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  return value.trim();
}
function assertType(value: unknown): EntryType {
  if (value !== "file" && value !== "directory") throw new Error("type must be 'file' or 'directory'");
  return value;
}

/* ------------------------------ profile ------------------------------ */

export function getProfile() {
  const existing = db.select().from(profile).where(eq(profile.id, PROFILE_ID)).get();
  if (existing) return existing;
  const stamp = now();
  let username = "user";
  try {
    username = userInfo().username || username;
  } catch {
    /* keep fallback */
  }
  const row = {
    id: PROFILE_ID,
    displayName: username,
    role: "Administrator",
    avatarColor: AVATAR_COLORS[0],
    createdAt: stamp,
    updatedAt: stamp,
  };
  db.insert(profile).values(row).run();
  return row;
}

export function updateProfile(input: { displayName?: unknown; role?: unknown; avatarColor?: unknown }) {
  const current = getProfile();
  const patch: Partial<typeof current> = { updatedAt: now() };
  if (input.displayName !== undefined) {
    const name = assertPath(input.displayName, "displayName");
    if (name.length > 48) throw new Error("displayName is too long (max 48)");
    patch.displayName = name;
  }
  if (input.role !== undefined) {
    const role = typeof input.role === "string" ? input.role.trim() : "";
    if (role.length > 48) throw new Error("role is too long (max 48)");
    patch.role = role || null;
  }
  if (input.avatarColor !== undefined) {
    const color = typeof input.avatarColor === "string" ? input.avatarColor : "";
    if (color && !AVATAR_COLORS.includes(color)) throw new Error("Unknown avatarColor");
    patch.avatarColor = color || null;
  }
  db.update(profile).set(patch).where(eq(profile.id, PROFILE_ID)).run();
  return getProfile();
}

/* -------------------------------- pins -------------------------------- */

export const listPins = () =>
  db
    .select({ path: workspacePins.path, name: workspacePins.name, sortOrder: workspacePins.sortOrder })
    .from(workspacePins)
    .orderBy(asc(workspacePins.sortOrder), asc(workspacePins.createdAt))
    .all();

export function addPin(path: unknown, name: unknown) {
  const p = assertPath(path);
  const next = (db.select({ max: sql<number>`coalesce(max(${workspacePins.sortOrder}), -1)` }).from(workspacePins).get()?.max ?? -1) + 1;
  db.insert(workspacePins)
    .values({ path: p, name: assertPath(name, "name"), sortOrder: next, createdAt: now() })
    .onConflictDoNothing()
    .run();
  return listPins();
}

export function removePin(path: unknown) {
  db.delete(workspacePins).where(eq(workspacePins.path, assertPath(path))).run();
  return listPins();
}

export function reorderPins(paths: unknown) {
  if (!Array.isArray(paths)) throw new Error("paths must be an array");
  paths.forEach((p, index) => {
    if (typeof p === "string") db.update(workspacePins).set({ sortOrder: index }).where(eq(workspacePins.path, p)).run();
  });
  return listPins();
}

/* ----------------------------- favorites ----------------------------- */

export const listFavorites = () =>
  db
    .select({ path: workspaceFavorites.path, name: workspaceFavorites.name, type: workspaceFavorites.type })
    .from(workspaceFavorites)
    .orderBy(asc(workspaceFavorites.createdAt))
    .all();

export function addFavorite(path: unknown, name: unknown, type: unknown) {
  db.insert(workspaceFavorites)
    .values({ path: assertPath(path), name: assertPath(name, "name"), type: assertType(type), createdAt: now() })
    .onConflictDoNothing()
    .run();
  return listFavorites();
}

export function removeFavorite(path: unknown) {
  db.delete(workspaceFavorites).where(eq(workspaceFavorites.path, assertPath(path))).run();
  return listFavorites();
}

/* ------------------------------ recents ------------------------------ */

export const listRecents = () =>
  db.select().from(workspaceRecents).orderBy(desc(workspaceRecents.openedAt)).limit(MAX_RECENTS).all();

export function touchRecent(path: unknown, name: unknown) {
  const p = assertPath(path);
  const stamp = now();
  db.insert(workspaceRecents)
    .values({ path: p, name: assertPath(name, "name"), openedAt: stamp })
    .onConflictDoUpdate({ target: workspaceRecents.path, set: { name: assertPath(name, "name"), openedAt: stamp } })
    .run();
  const keep = db.select({ path: workspaceRecents.path }).from(workspaceRecents).orderBy(desc(workspaceRecents.openedAt)).limit(MAX_RECENTS).all();
  const keepPaths = keep.map((row) => row.path);
  if (keepPaths.length === MAX_RECENTS) {
    db.delete(workspaceRecents).where(sql`${workspaceRecents.path} not in (${sql.join(keepPaths.map((k) => sql`${k}`), sql`, `)})`).run();
  }
  return listRecents();
}

export function clearRecents() {
  db.delete(workspaceRecents).run();
  return [];
}

/* ------------------------------- prefs ------------------------------- */

const PREF_KEYS = new Set(["view", "showHidden", "sortBy", "sortDir"]);

export function getPrefs(): Record<string, string> {
  return Object.fromEntries(db.select().from(workspacePrefs).all().map((row) => [row.key, row.value]));
}

export function setPref(key: unknown, value: unknown) {
  if (typeof key !== "string" || !PREF_KEYS.has(key)) throw new Error("Unknown preference key");
  if (typeof value !== "string" || value.length > 64) throw new Error("Invalid preference value");
  db.insert(workspacePrefs)
    .values({ key, value, updatedAt: now() })
    .onConflictDoUpdate({ target: workspacePrefs.key, set: { value, updatedAt: now() } })
    .run();
  return getPrefs();
}

/* --------------------------- editor sessions --------------------------- */

export function getEditorSession(root: unknown) {
  const row = db.select().from(editorSessions).where(eq(editorSessions.root, assertPath(root, "root"))).get();
  if (!row) return null;
  let tabs: string[] = [];
  try {
    const parsed = JSON.parse(row.tabs);
    if (Array.isArray(parsed)) tabs = parsed.filter((t): t is string => typeof t === "string");
  } catch {
    /* corrupted → empty */
  }
  return { root: row.root, tabs, activePath: row.activePath };
}

export function saveEditorSession(root: unknown, tabs: unknown, activePath: unknown) {
  const r = assertPath(root, "root");
  if (!Array.isArray(tabs)) throw new Error("tabs must be an array");
  const list = tabs.filter((t): t is string => typeof t === "string").slice(0, 50);
  const active = typeof activePath === "string" && list.includes(activePath) ? activePath : null;
  const values = { root: r, tabs: JSON.stringify(list), activePath: active, updatedAt: now() };
  db.insert(editorSessions)
    .values(values)
    .onConflictDoUpdate({ target: editorSessions.root, set: { tabs: values.tabs, activePath: active, updatedAt: values.updatedAt } })
    .run();
  return getEditorSession(r);
}

/* --------------------------- aggregate state --------------------------- */

export function getWorkspaceState() {
  return { pins: listPins(), favorites: listFavorites(), recents: listRecents(), prefs: getPrefs() };
}

/* -------- keep references consistent after rename / move / delete -------- */

const under = (column: typeof workspacePins.path | typeof workspaceFavorites.path | typeof workspaceRecents.path | typeof editorSessions.root, from: string) =>
  or(eq(column, from), like(column, `${from.replace(/[\\%_]/g, "\\$&")}/%`));

const rewrite = (value: string, from: string, to: string) => (value === from ? to : value.startsWith(`${from}/`) ? to + value.slice(from.length) : value);

/** Rewrite stored paths after a rename/move of `from` → `to`. */
export function rewritePaths(from: string, to: string) {
  const tables = [
    { table: workspacePins, column: workspacePins.path },
    { table: workspaceFavorites, column: workspaceFavorites.path },
    { table: workspaceRecents, column: workspaceRecents.path },
  ] as const;
  for (const { table, column } of tables) {
    const rows = db.select({ path: column }).from(table).where(under(column, from)).all();
    for (const row of rows) {
      const next = rewrite(row.path, from, to);
      // Drop on collision, otherwise update (name follows the final segment when the entry itself was renamed).
      const exists = db.select({ path: column }).from(table).where(eq(column, next)).get();
      if (exists) db.delete(table).where(eq(column, row.path)).run();
      else if (row.path === from) db.update(table).set({ path: next, name: next.split("/").at(-1) ?? next } as never).where(eq(column, row.path)).run();
      else db.update(table).set({ path: next } as never).where(eq(column, row.path)).run();
    }
  }
  const sessions = db.select().from(editorSessions).where(under(editorSessions.root, from)).all();
  for (const row of sessions) {
    const root = rewrite(row.root, from, to);
    const tabs = (() => {
      try {
        return (JSON.parse(row.tabs) as string[]).map((t) => rewrite(t, from, to));
      } catch {
        return [];
      }
    })();
    db.delete(editorSessions).where(eq(editorSessions.root, row.root)).run();
    db.insert(editorSessions)
      .values({ root, tabs: JSON.stringify(tabs), activePath: row.activePath ? rewrite(row.activePath, from, to) : null, updatedAt: now() })
      .onConflictDoNothing()
      .run();
  }
}

/** Drop stored references to a deleted path (and everything below it). */
export function purgePaths(path: string) {
  db.delete(workspacePins).where(under(workspacePins.path, path)).run();
  db.delete(workspaceFavorites).where(under(workspaceFavorites.path, path)).run();
  db.delete(workspaceRecents).where(under(workspaceRecents.path, path)).run();
  db.delete(editorSessions).where(under(editorSessions.root, path)).run();
  const rest = db.select().from(editorSessions).where(inArray(editorSessions.activePath, [path])).all();
  for (const row of rest) db.update(editorSessions).set({ activePath: null }).where(eq(editorSessions.root, row.root)).run();
}
