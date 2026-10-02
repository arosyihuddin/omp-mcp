import type { ActiveWindow, DesktopWindow, ProcessInfo } from "../linux/windows";

export async function listMacWindows(): Promise<DesktopWindow[]> { throw new Error("macOS window listing is not implemented yet"); }
export async function activeMacWindow(): Promise<ActiveWindow | null> { throw new Error("macOS active window is not implemented yet"); }
export async function focusMacWindow(_id: string): Promise<void> { throw new Error("macOS window focus is not implemented yet"); }
export async function closeMacWindow(_id: string): Promise<void> { throw new Error("macOS window close is not implemented yet"); }
export async function moveMacWindow(_id: string, _workspace: string): Promise<void> { throw new Error("macOS window move is not implemented yet"); }
export async function listMacProcesses(): Promise<ProcessInfo[]> { throw new Error("macOS process listing is not implemented yet"); }
