import { pressLinuxKeys, typeLinuxText } from "./linux";
import { pressMacKeys, typeMacText } from "./macos";
import { pressWindowsKeys, typeWindowsText } from "./windows";

export async function keyPress(keys: string[]) {
  if (keys.length === 0) throw new Error("At least one key is required");
  if (process.platform === "linux") return pressLinuxKeys(keys);
  if (process.platform === "darwin") return pressMacKeys(keys);
  if (process.platform === "win32") return pressWindowsKeys(keys);
  throw new Error("Unsupported OS: " + process.platform);
}

export function typeText(text: string) {
  if (process.platform === "linux") return typeLinuxText(text);
  if (process.platform === "darwin") return typeMacText(text);
  if (process.platform === "win32") return typeWindowsText(text);
  throw new Error("Unsupported OS: " + process.platform);
}