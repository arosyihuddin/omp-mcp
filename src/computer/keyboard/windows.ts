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

const windowsKeys: Record<string, string> = {
  enter: "{ENTER}", tab: "{TAB}", backspace: "{BACKSPACE}", delete: "{DELETE}",
  escape: "{ESC}", esc: "{ESC}", space: " ", left: "{LEFT}", right: "{RIGHT}",
  up: "{UP}", down: "{DOWN}", home: "{HOME}", end: "{END}", pageup: "{PGUP}", pagedown: "{PGDN}",
};

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replaceAll(" ", "");
}

export async function pressWindowsKeys(keys: string[]) {
  const modifiers: Record<string, string> = { ctrl: "^", control: "^", alt: "%", shift: "+" };
  const prefix = keys.slice(0, -1).map(normalizeKey).map((key) => modifiers[key]).filter(Boolean).join("");
  const key = normalizeKey(keys.at(-1)!);
  const target = windowsKeys[key] ?? key;
  const script = "Add-Type -AssemblyName Microsoft.VisualBasic; (New-Object -ComObject WScript.Shell).SendKeys('" + (prefix + target).replaceAll("'", "''") + "')";
  return powerShell(script);
}

export async function typeWindowsText(text: string) {
  const escaped = text.replace(/[+^%~(){}]/g, (m) => "{" + m + "}");
  return powerShell("(New-Object -ComObject WScript.Shell).SendKeys('" + escaped.replaceAll("'", "''") + "')");
}