import { takeLinuxScreenshot } from "./linux";
import { takeMacScreenshot } from "./macos";
import { takeWindowsScreenshot } from "./windows";

export async function takeScreenshot(outputPath?: string) {
  if (process.platform === "linux") return takeLinuxScreenshot(outputPath);
  if (process.platform === "darwin") return takeMacScreenshot(outputPath);
  if (process.platform === "win32") return takeWindowsScreenshot(outputPath);
  throw new Error("Unsupported OS: " + process.platform);
}