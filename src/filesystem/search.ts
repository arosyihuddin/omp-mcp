import { access } from "node:fs/promises";

interface CommandOptions {
  cwd: string;
  signal?: AbortSignal;
  timeoutMs: number;
}

async function runCommand(command: string[], options: CommandOptions): Promise<string> {
  const binary = command[0];
  if (!binary || !Bun.which(binary)) {
    throw new Error(`${binary ?? "search command"} is not installed`);
  }

  const process = Bun.spawn(command, {
    cwd: options.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  let aborted = false;
  const abort = () => {
    aborted = true;
    process.kill();
  };
  options.signal?.addEventListener("abort", abort, { once: true });

  const timeout = setTimeout(() => process.kill(), options.timeoutMs);
  try {
    const [exitCode, stdout, stderr] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
    ]);

    if (aborted) throw new Error("Search aborted");
    if (exitCode !== 0) {
      const message = stderr.trim();
      throw new Error(message || `${binary} exited with code ${exitCode}`);
    }

    return stdout;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}

async function ensurePath(path: string, cwd: string): Promise<void> {
  try {
    await access(path.startsWith("/") ? path : `${cwd}/${path}`);
  } catch {
    throw new Error(`Path not found: ${path}`);
  }
}

export interface FsFindInput {
  pattern?: string;
  path?: string;
  type?: "file" | "directory" | "both";
  hidden?: boolean;
  max_results?: number;
  max_depth?: number;
}

export interface FsGrepInput {
  pattern: string;
  path?: string;
  glob?: string;
  hidden?: boolean;
  max_results?: number;
  max_depth?: number;
  fixed_strings?: boolean;
}

export async function fsFind(
  input: FsFindInput,
  cwd: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const searchPath = input.path || cwd;
  await ensurePath(searchPath, cwd);

  const maxResults = Math.min(Math.max(Math.floor(input.max_results ?? 100), 1), 1000);
  const args = ["fd", "--color", "never", "--max-results", String(maxResults)];

  if (!input.hidden) args.push("--hidden");
  if (input.type === "file") args.push("--type", "f");
  else if (input.type === "directory") args.push("--type", "d");

  if (input.max_depth !== undefined) {
    if (!Number.isInteger(input.max_depth) || input.max_depth < 0) {
      throw new Error("max_depth must be a non-negative integer");
    }
    args.push("--max-depth", String(input.max_depth));
  }

  if (input.pattern) args.push(input.pattern);
  args.push(searchPath);

  const stdout = await runCommand(args, { cwd, signal, timeoutMs: 10_000 });
  const results = stdout.split("\n").map((line) => line.trim()).filter(Boolean);

  return {
    results,
    count: results.length,
    truncated: results.length >= maxResults,
  };
}

export async function fsGrep(
  input: FsGrepInput,
  cwd: string,
  signal?: AbortSignal,
): Promise<unknown> {
  if (!input.pattern.trim()) throw new Error("pattern must be non-empty");

  const searchPath = input.path || cwd;
  await ensurePath(searchPath, cwd);

  const maxResults = Math.min(Math.max(Math.floor(input.max_results ?? 100), 1), 1000);
  const args = ["rg", "--color", "never", "--line-number", "--max-count", String(maxResults)];

  if (input.hidden) args.push("--hidden");
  if (input.fixed_strings) args.push("--fixed-strings");
  if (input.glob) args.push("--glob", input.glob);
  if (input.max_depth !== undefined) {
    if (!Number.isInteger(input.max_depth) || input.max_depth < 0) {
      throw new Error("max_depth must be a non-negative integer");
    }
    args.push("--max-depth", String(input.max_depth));
  }

  args.push(input.pattern, searchPath);

  const stdout = await runCommand(args, { cwd, signal, timeoutMs: 10_000 }).catch((error) => {
    if (error instanceof Error && error.message.includes("exited with code 1")) return "";
    throw error;
  });
  const matches = stdout.split("\n").filter(Boolean);

  return {
    matches,
    count: matches.length,
    truncated: matches.length >= maxResults,
  };
}
