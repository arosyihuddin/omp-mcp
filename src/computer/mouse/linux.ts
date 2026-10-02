async function run(command: string, args: string[] = []) {
  const proc = Bun.spawn([command, ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout: stdout.trim(), stderr: stderr.trim() };
}

const buttons: Record<string, { click: string; down: string; up: string }> = {
  left: { click: "0xC0", down: "0x40", up: "0x80" },
  right: { click: "0xC1", down: "0x41", up: "0x81" },
  middle: { click: "0xC2", down: "0x42", up: "0x82" },
  back: { click: "0xC6", down: "0x46", up: "0x86" },
  forward: { click: "0xC5", down: "0x45", up: "0x85" },
};

export async function moveLinuxMouse(x: number, y: number) {
  const result = await run("ydotool", ["mousemove", "--absolute", String(x), String(y)]);
  if (result.code !== 0) throw new Error(result.stderr || "ydotool mousemove failed");
}

export async function clickLinuxMouse(button: string, clicks: number) {
  const entry = buttons[button];
  if (!entry) throw new Error("Unsupported mouse button: " + button);
  for (let i = 0; i < clicks; i++) {
    const result = await run("ydotool", ["click", entry.click]);
    if (result.code !== 0) throw new Error(result.stderr || "ydotool click failed");
  }
}

export async function dragLinuxMouse(fromX: number, fromY: number, toX: number, toY: number) {
  const entry = buttons.left;
  let result = await run("ydotool", ["mousemove", "--absolute", String(fromX), String(fromY)]);
  if (result.code !== 0) throw new Error(result.stderr || "ydotool drag move failed");
  result = await run("ydotool", ["click", entry.down]);
  if (result.code !== 0) throw new Error(result.stderr || "ydotool mouse down failed");
  result = await run("ydotool", ["mousemove", "--absolute", String(toX), String(toY)]);
  if (result.code !== 0) {
    await run("ydotool", ["click", entry.up]);
    throw new Error(result.stderr || "ydotool drag move failed");
  }
  result = await run("ydotool", ["click", entry.up]);
  if (result.code !== 0) throw new Error(result.stderr || "ydotool mouse up failed");
}

export async function scrollLinuxMouse(dx: number, dy: number) {
  if (dx !== 0) {
    const result = await run("ydotool", ["mousemove", "--wheel", String(dx), "0"]);
    if (result.code !== 0) throw new Error(result.stderr || "ydotool horizontal scroll failed");
  }
  if (dy !== 0) {
    const result = await run("ydotool", ["mousemove", "--wheel", "0", String(dy)]);
    if (result.code !== 0) throw new Error(result.stderr || "ydotool vertical scroll failed");
  }
}