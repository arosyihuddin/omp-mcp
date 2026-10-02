export { pressWindowsKeys as pressKeys, typeWindowsText as typeText } from "./keyboard";
export { moveWindowsMouse as mouseMove, clickWindowsMouse as mouseClick, dragWindowsMouse as mouseDrag, scrollWindowsMouse as mouseScroll } from "./mouse";
export { takeWindowsScreenshot as takeScreenshot } from "./screenshot";
export { listWindowsWindows as listWindows, activeWindowsWindow as activeWindow, focusWindowsWindow as focusWindow, closeWindowsWindow as closeWindow, moveWindowsWindow as moveWindow } from "./windows";
export { listWindowsApps as listApps } from "./apps";
export type { DesktopApp } from "./apps";
