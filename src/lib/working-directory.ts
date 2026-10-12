import { access, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";

/**
 * Convert user-provided working directories to an existing absolute directory.
 * Relative paths are interpreted as home-relative first, then process-relative.
 */
export async function resolveWorkingDirectory(input: string): Promise<string> {
  const value = input.trim();
  if (!value) throw new Error("Working directory must not be empty");

  const candidates = isAbsolute(value)
    ? [resolve(value)]
    : [resolve(homedir(), value), resolve(process.cwd(), value)];

  for (const candidate of [...new Set(candidates)]) {
    try {
      await access(candidate);
      const info = await stat(candidate);
      if (info.isDirectory()) return candidate;
    } catch {
      // Try the next interpretation, then report all attempted locations.
    }
  }

  throw new Error("Working directory does not exist or is not a directory: \"" + value + "\". Checked: " + candidates.join(", "));
}
