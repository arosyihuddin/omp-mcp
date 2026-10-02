async function run(command: string, args: string[] = []) {
  const proc = Bun.spawn([command, ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout: stdout.trim(), stderr: stderr.trim() };
}

async function powerShell(script: string) {
  const result = await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-STA", "-Command", script]);
  if (result.code !== 0) throw new Error(result.stderr || "PowerShell input failed");
}

export async function moveWindowsMouse(x: number, y: number) {
  const script = "Add-Type @'\nusing System; using System.Runtime.InteropServices; public static class Mouse { [DllImport(\"user32.dll\")] public static extern bool SetCursorPos(int X, int Y); }\n'@; [Mouse]::SetCursorPos(" + x + "," + y + ") | Out-Null";
  return powerShell(script);
}

export async function clickWindowsMouse(button: string, clicks: number) {
  const flags: Record<string, string> = { left: "0x0002,0x0004", right: "0x0008,0x0010", middle: "0x0020,0x0040" };
  const pair = flags[button];
  if (!pair) throw new Error("Unsupported Windows mouse button: " + button);
  const [down, up] = pair.split(",");
  const script = "Add-Type @'\nusing System; using System.Runtime.InteropServices; public static class Mouse { [DllImport(\"user32.dll\")] public static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra); }\n'@; 1.." + clicks + " | % { [Mouse]::mouse_event(" + down + ",0,0,0,[UIntPtr]::Zero); [Mouse]::mouse_event(" + up + ",0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 30 }";
  return powerShell(script);
}

export async function dragWindowsMouse(fromX: number, fromY: number, toX: number, toY: number) {
  const script = "Add-Type @'\nusing System; using System.Runtime.InteropServices; public static class Mouse { [DllImport(\"user32.dll\")] public static extern bool SetCursorPos(int X, int Y); [DllImport(\"user32.dll\")] public static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra); }\n'@; [Mouse]::SetCursorPos(" + fromX + "," + fromY + "); [Mouse]::mouse_event(0x0002,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 30; [Mouse]::SetCursorPos(" + toX + "," + toY + "); [Mouse]::mouse_event(0x0004,0,0,0,[UIntPtr]::Zero)";
  return powerShell(script);
}

export async function scrollWindowsMouse(dx: number, dy: number) {
  if (dx !== 0) throw new Error("Windows horizontal scroll is not implemented");
  if (dy !== 0) {
    const script = "Add-Type @'\nusing System; using System.Runtime.InteropServices; public static class Mouse { [DllImport(\"user32.dll\")] public static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra); }\n'@; [Mouse]::mouse_event(0x0800,0,0," + (dy * 120) + ",[UIntPtr]::Zero)";
    return powerShell(script);
  }
}