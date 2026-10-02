import * as linux from "./linux";
import * as macos from "./macos";
import * as windows from "./windows";

const computer = process.platform === "linux" ? linux : process.platform === "darwin" ? macos : process.platform === "win32" ? windows : null;
if (!computer) throw new Error(`Unsupported OS: ${process.platform}`);

export const keyPress = computer.pressKeys;
export const typeText = computer.typeText;
export const mouseMove = computer.mouseMove;
export const mouseClick = computer.mouseClick;
export const mouseDrag = computer.mouseDrag;
export const mouseScroll = computer.mouseScroll;
export const takeScreenshot = computer.takeScreenshot;
export const listWindows = computer.listWindows;
export const activeWindow = computer.activeWindow;
export const focusWindow = computer.focusWindow;
export const closeWindow = computer.closeWindow;
export const moveWindow = computer.moveWindow;
export const listApps = computer.listApps;
