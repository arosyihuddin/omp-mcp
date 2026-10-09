import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

let handle: (request: Request) => Promise<Response>;
const sandbox = `.omp-test-${process.pid}`;
const dataDir = mkdtempSync(join(tmpdir(), "omp-db-"));

const call = async (method: string, path: string, body?: unknown) => {
  const response = await handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
  return { status: response.status, data: (await response.json().catch(() => null)) as any };
};

beforeAll(async () => {
  process.env.OMP_DATA_DIR = dataDir;
  ({ handleDashboardRequest: handle } = await import("../src/dashboard"));
  const created = await call("POST", "/api/workspace/create", { path: sandbox, type: "directory" });
  expect(created.status).toBe(201);
});

afterAll(() => {
  rmSync(join(homedir(), sandbox), { recursive: true, force: true });
  rmSync(dataDir, { recursive: true, force: true });
});

describe("workspace api", () => {
  test("profile has defaults and can be updated", async () => {
    const first = await call("GET", "/api/profile");
    expect(first.data.displayName).toBeTruthy();
    const updated = await call("PUT", "/api/profile", { displayName: "Tester", role: "Dev" });
    expect(updated.data.displayName).toBe("Tester");
    expect((await call("GET", "/api/profile")).data.role).toBe("Dev");
  });

  test("profile avatar color is validated against the token palette", async () => {
    expect((await call("PUT", "/api/profile", { avatarColor: "success" })).data.avatarColor).toBe("success");
    const bad = await call("PUT", "/api/profile", { avatarColor: "#ff0000" });
    expect(bad.status).toBe(400);
    expect((await call("PUT", "/api/profile", { displayName: "x".repeat(49) })).status).toBe(400);
  });

  test("create, conflict, rename, duplicate, move, stat, delete", async () => {
    const file = `${sandbox}/a.txt`;
    expect((await call("POST", "/api/workspace/create", { path: file, type: "file" })).status).toBe(201);
    expect((await call("POST", "/api/workspace/create", { path: file, type: "file" })).status).toBe(409);
    expect((await call("POST", "/api/workspace/rename", { path: file, newName: "b.txt" })).data.path).toBe(`${sandbox}/b.txt`);
    expect((await call("POST", "/api/workspace/rename", { path: `${sandbox}/b.txt`, newName: "x/y" })).status).toBe(400);
    expect((await call("POST", "/api/workspace/duplicate", { path: `${sandbox}/b.txt` })).data.name).toBe("b copy.txt");
    await call("POST", "/api/workspace/create", { path: `${sandbox}/sub`, type: "directory" });
    expect((await call("POST", "/api/workspace/move", { path: `${sandbox}/b.txt`, destDir: `${sandbox}/sub` })).data.path).toBe(`${sandbox}/sub/b.txt`);
    const info = await call("GET", `/api/workspace/stat?path=${encodeURIComponent(`${sandbox}/sub`)}`);
    expect(info.data.type).toBe("directory");
    expect(info.data.children).toBe(1);
    expect((await call("DELETE", `/api/workspace?path=${encodeURIComponent(`${sandbox}/sub`)}`)).status).toBe(200);
    expect(existsSync(join(homedir(), sandbox, "sub"))).toBe(false);
  });

  test("rejects traversal", async () => {
    expect((await call("POST", "/api/workspace/create", { path: "../../evil", type: "file" })).status).toBe(400);
    expect((await call("GET", "/api/workspace/stat?path=../../etc")).status).toBe(400);
  });

  test("pins, favorites, recents, prefs follow renames and deletes", async () => {
    await call("POST", "/api/workspace/create", { path: `${sandbox}/proj`, type: "directory" });
    await call("POST", "/api/workspace/pins", { path: `${sandbox}/proj`, name: "proj" });
    await call("POST", "/api/workspace/favorites", { path: `${sandbox}/proj`, name: "proj", type: "directory" });
    await call("POST", "/api/workspace/recents", { path: `${sandbox}/proj`, name: "proj" });
    expect((await call("PUT", "/api/workspace/prefs", { key: "view", value: "grid" })).data.prefs.view).toBe("grid");
    expect((await call("PUT", "/api/workspace/prefs", { key: "nope", value: "x" })).status).toBe(400);

    await call("POST", "/api/workspace/rename", { path: `${sandbox}/proj`, newName: "proj2" });
    let state = (await call("GET", "/api/workspace/state")).data;
    expect(state.pins.map((p: any) => p.path)).toContain(`${sandbox}/proj2`);
    expect(state.favorites.map((f: any) => f.path)).toContain(`${sandbox}/proj2`);
    expect(state.pins.find((p: any) => p.path === `${sandbox}/proj2`)?.name).toBe("proj2");

    await call("DELETE", `/api/workspace?path=${encodeURIComponent(`${sandbox}/proj2`)}`);
    state = (await call("GET", "/api/workspace/state")).data;
    expect(state.pins.map((p: any) => p.path)).not.toContain(`${sandbox}/proj2`);
    expect(state.favorites.map((f: any) => f.path)).not.toContain(`${sandbox}/proj2`);
    expect(state.recents.map((item: any) => item.path)).not.toContain(`${sandbox}/proj2`);
  });

  test("editor session round-trips", async () => {
    await call("PUT", "/api/workspace/editor-session", { root: sandbox, tabs: [`${sandbox}/a`, `${sandbox}/b`], activePath: `${sandbox}/b` });
    const { data } = await call("GET", `/api/workspace/editor-session?root=${encodeURIComponent(sandbox)}`);
    expect(data.session.tabs).toHaveLength(2);
    expect(data.session.activePath).toBe(`${sandbox}/b`);
  });
});
