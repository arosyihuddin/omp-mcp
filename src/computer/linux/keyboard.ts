async function run(command: string, args: string[] = []) {
  const proc = Bun.spawn([command, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout: stdout.trim(), stderr: stderr.trim() };
}

const linuxKeys: Record<string, number> = {
  esc: 1,
  escape: 1,
  enter: 28,
  tab: 15,
  backspace: 14,
  space: 57,
  left: 105,
  right: 106,
  up: 103,
  down: 108,
  home: 102,
  end: 107,
  pageup: 104,
  pagedown: 109,
  insert: 110,
  delete: 111,
  shift: 42,
  ctrl: 29,
  control: 29,
  alt: 56,
  meta: 125,
  super: 125,
  capslock: 58,
  numlock: 69,
  scrolllock: 70,
  f1: 59,
  f2: 60,
  f3: 61,
  f4: 62,
  f5: 63,
  f6: 64,
  f7: 65,
  f8: 66,
  f9: 67,
  f10: 68,
  f11: 87,
  f12: 88,
  a: 30,
  b: 48,
  c: 46,
  d: 32,
  e: 18,
  f: 33,
  g: 34,
  h: 35,
  i: 23,
  j: 36,
  k: 37,
  l: 38,
  m: 50,
  n: 49,
  o: 24,
  p: 25,
  q: 16,
  r: 19,
  s: 31,
  t: 20,
  u: 22,
  v: 47,
  w: 17,
  x: 45,
  y: 21,
  z: 44,
  "0": 11,
  "1": 2,
  "2": 3,
  "3": 4,
  "4": 5,
  "5": 6,
  "6": 7,
  "7": 8,
  "8": 9,
  "9": 10,
};

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replaceAll(" ", "");
}

export async function pressLinuxKeys(keys: string[]) {
  const codes = keys.map((key) => {
    const code = linuxKeys[normalizeKey(key)];
    if (!code) throw new Error("Unsupported Linux key: " + key);
    return code;
  });
  const events = [
    ...codes.map((code) => code + ":1"),
    ...codes
      .slice()
      .reverse()
      .map((code) => code + ":0"),
  ];
  const result = await run("ydotool", ["key", ...events]);
  if (result.code !== 0) throw new Error(result.stderr || "ydotool key failed");
}

export async function typeLinuxText(text: string) {
  const result = await run("ydotool", ["type", "--", text]);
  if (result.code !== 0)
    throw new Error(result.stderr || "ydotool type failed");
}
