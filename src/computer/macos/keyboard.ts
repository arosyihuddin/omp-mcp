async function run(command: string, args: string[] = []) {
  const proc = Bun.spawn([command, ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout: stdout.trim(), stderr: stderr.trim() };
}

async function appleScript(script: string) {
  const result = await run("osascript", ["-e", script]);
  if (result.code !== 0) throw new Error(result.stderr || "osascript failed");
}

const macKeys: Record<string, string> = {
  enter: "return", tab: "tab", backspace: "delete", delete: "forward delete",
  escape: "escape", esc: "escape", space: "space", left: "left arrow", right: "right arrow",
  up: "up arrow", down: "down arrow", home: "home", end: "end", pageup: "page up", pagedown: "page down",
};

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replaceAll(" ", "");
}

export async function pressMacKeys(keys: string[]) {
  const modifiers: Record<string, string> = {
    ctrl: "control down", control: "control down", alt: "option down",
    shift: "shift down", meta: "command down", super: "command down",
  };
  const held = keys.slice(0, -1).map(normalizeKey).map((key) => modifiers[key]).filter(Boolean);
  const key = normalizeKey(keys.at(-1)!);
  const target = macKeys[key] ?? key;
  const escaped = target.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return appleScript("tell application \"System Events\" to " + (held.length ? held.join("; ") + "; " : "") + "keystroke \"" + escaped + "\"");
}

export async function typeMacText(text: string) {
  const escaped = text.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return appleScript("tell application \"System Events\" to keystroke \"" + escaped + "\"");
}