import { clickLinuxMouse, dragLinuxMouse, moveLinuxMouse, scrollLinuxMouse } from "./linux";
import { clickMacMouse, moveMacMouse, scrollMacMouse } from "./macos";
import { clickWindowsMouse, dragWindowsMouse, moveWindowsMouse, scrollWindowsMouse } from "./windows";

export async function mouseMove(x: number, y: number) {
  if (process.platform === "linux") return moveLinuxMouse(x, y);
  if (process.platform === "darwin") return moveMacMouse(x, y);
  if (process.platform === "win32") return moveWindowsMouse(x, y);
  throw new Error("Unsupported OS: " + process.platform);
}

export async function mouseClick(button: "left" | "right" | "middle" | "back" | "forward" = "left", clicks = 1, x?: number, y?: number) {
  if (x === undefined || y === undefined) throw new Error("mouseClick requires x and y");
  if (process.platform === "linux") {
    await moveLinuxMouse(x, y);
    return clickLinuxMouse(button, clicks);
  }
  if (process.platform === "darwin") return clickMacMouse(button, clicks, x, y);
  if (process.platform === "win32") {
    await moveWindowsMouse(x, y);
    return clickWindowsMouse(button, clicks);
  }
  throw new Error("Unsupported OS: " + process.platform);
}

export function mouseDrag(fromX: number, fromY: number, toX: number, toY: number) {
  if (process.platform === "linux") return dragLinuxMouse(fromX, fromY, toX, toY);
  if (process.platform === "darwin") throw new Error("macOS mouse drag is not implemented");
  if (process.platform === "win32") return dragWindowsMouse(fromX, fromY, toX, toY);
  throw new Error("Unsupported OS: " + process.platform);
}

export function mouseScroll(dx: number, dy: number) {
  if (process.platform === "linux") return scrollLinuxMouse(dx, dy);
  if (process.platform === "darwin") return scrollMacMouse(dx, dy);
  if (process.platform === "win32") return scrollWindowsMouse(dx, dy);
  throw new Error("Unsupported OS: " + process.platform);
}