export { pressLinuxKeys as pressKeys, typeLinuxText as typeText } from "./keyboard";
export { moveLinuxMouse as mouseMove, clickLinuxMouse as mouseClick, dragLinuxMouse as mouseDrag, scrollLinuxMouse as mouseScroll } from "./mouse";
export { takeLinuxScreenshot as takeScreenshot } from "./screenshot";
export { listLinuxWindows as listWindows, getLinuxActiveWindow as activeWindow, focusLinuxWindow as focusWindow, closeLinuxWindow as closeWindow, moveLinuxWindow as moveWindow } from "./windows";
export { listLinuxApps as listApps } from "./apps";
export type { DesktopWindow, ActiveWindow } from "./windows";
export type { DesktopApp } from "./apps";
