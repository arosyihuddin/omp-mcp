import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fsFind } from "../src/filesystem/search";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("filesystem find", () => {
  test("searches files without requiring fd and respects hidden-file settings", async () => {
    const root = await mkdtemp(join(tmpdir(), "omp-fs-find-"));
    directories.push(root);
    await mkdir(join(root, "nested"));
    await writeFile(join(root, "visible.txt"), "visible");
    await writeFile(join(root, ".hidden.txt"), "hidden");
    await writeFile(join(root, "nested", "inside.txt"), "nested");

    const visible = await fsFind({ pattern: "\\.txt$", path: root, type: "file" }, root) as { results: string[] };
    expect(visible.results).toContain(join(root, "visible.txt"));
    expect(visible.results).toContain(join(root, "nested", "inside.txt"));
    expect(visible.results).not.toContain(join(root, ".hidden.txt"));

    const withHidden = await fsFind({ pattern: "\\.txt$", path: root, type: "file", hidden: true }, root) as { results: string[] };
    expect(withHidden.results).toContain(join(root, ".hidden.txt"));
  });
});
