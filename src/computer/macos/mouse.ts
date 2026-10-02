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

export async function moveMacMouse(x: number, y: number) {
  return appleScript("tell application \"System Events\" to move mouse to {" + x + ", " + y + "}");
}

export async function clickMacMouse(button: string, clicks: number, x: number, y: number) {
  if (button !== "left" && button !== "right") throw new Error("macOS currently supports left/right click");
  const click = button === "right"
    ? "click at {" + x + ", " + y + "} using {control down}"
    : "click at {" + x + ", " + y + "}";
  for (let i = 0; i < clicks; i++) await appleScript("tell application \"System Events\" to " + click);
}

export async function dragMacMouse(_fromX: number, _fromY: number, _toX: number, _toY: number) {
  throw new Error("macOS mouse drag is not implemented");
}

export async function scrollMacMouse(dx: number, dy: number) {
  if (dx !== 0) throw new Error("macOS horizontal scroll is not implemented");
  if (dy !== 0) return appleScript("tell application \"System Events\" to scroll " + dy);
}