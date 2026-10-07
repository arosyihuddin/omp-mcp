import { readdir, stat } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { config } from "./lib/config";
import { getCapabilities, getHardwareInfo, getSystemInfo } from "./system/info";
import { approveApproval, clearApprovalHistory, denyApproval, listApprovals } from "./approval";
import { sdkSessionManager } from "./omp/sdk-session";

import { getDashboardTools } from "./dashboard-tools";

const dashboardRoot = new URL("../dashboard/dist/", import.meta.url);

function workspacePath(input: string | null) {
  const root = resolve(config.ompDefaultCwd);
  const target = resolve(root, input ?? ".");
  const rel = relative(root, target);
  if (rel === ".." || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) throw new Error("Workspace path is outside the configured workspace");
  return { root, target, relativePath: rel || "." };
}

async function getWorkspaceEntries(input: string | null) {
  const { target, relativePath } = workspacePath(input);
  const entries = await readdir(target, { withFileTypes: true });
  const items = await Promise.all(entries.map(async (entry) => {
    const fullPath = resolve(target, entry.name);
    const info = await stat(fullPath);
    return { name: entry.name, type: entry.isDirectory() ? "directory" : "file", size: entry.isFile() ? info.size : null, modified: info.mtime.toISOString() };
  }));
  items.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1);
  return { path: relativePath, items };
}

function contentType(path: string) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".ico")) return "image/x-icon";
  return "application/octet-stream";
}

async function serveAsset(pathname: string): Promise<Response> {
  const requested = pathname === "/" || pathname === "/dashboard" ? "index.html" : pathname.replace(/^\/+/, "");
  if (requested.includes("..")) return new Response("Bad Request", { status: 400 });

  const file = Bun.file(new URL(requested, dashboardRoot));
  if (!(await file.exists())) {
    const fallback = Bun.file(new URL("index.html", dashboardRoot));
    if (await fallback.exists()) return new Response(fallback, { headers: { "content-type": "text/html; charset=utf-8" } });
    return new Response("Dashboard build not found. Run dashboard build first.", { status: 404 });
  }

  return new Response(file, { headers: { "content-type": contentType(requested), "cache-control": requested === "index.html" ? "no-cache" : "public, max-age=31536000, immutable" } });
}

export async function handleDashboardRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/api/dashboard") {
    const [system, hardware, capabilities, tools] = await Promise.all([
      getSystemInfo(), getHardwareInfo(), getCapabilities(), getDashboardTools()
    ]);
    return Response.json({ host: { system, hardware, capabilities }, tools, sessions: sdkSessionManager.list() });
  }

  if (url.pathname === "/api/approvals") {
    return Response.json({ approvals: listApprovals() }, { headers: { "cache-control": "no-store" } });
  }
  if (url.pathname === "/api/approvals/clear" && request.method === "POST") {
    clearApprovalHistory();
    return Response.json({ approvals: listApprovals() }, { headers: { "cache-control": "no-store" } });
  }
  if (url.pathname.startsWith("/api/approvals/") && request.method === "POST") {
    const parts = url.pathname.split("/");
    const id = parts[3];
    const action = parts[4];
    if (!id || !["approve", "approve-session", "deny"].includes(action)) {
      return Response.json({ error: "Invalid approval action" }, { status: 400 });
    }
    const changed = action === "approve-session" ? approveApproval(id, true) : action === "approve" ? approveApproval(id) : denyApproval(id);
    if (!changed) return Response.json({ error: "Approval not found or no longer pending" }, { status: 404 });
    return Response.json({ approval: listApprovals().find((item) => item.id === id) }, { headers: { "cache-control": "no-store" } });
  }
  if (url.pathname === "/api/workspace") {
    try {
      return Response.json(await getWorkspaceEntries(url.searchParams.get("path")), { headers: { "cache-control": "no-store" } });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Unable to read workspace" }, { status: 400 });
    }
  }
  if (url.pathname === "/api/workspace/file") {
    try {
      const requested = url.searchParams.get("path");
      if (!requested) throw new Error("File path is required");
      const { target } = workspacePath(requested);
      const info = await stat(target);
      if (!info.isFile()) throw new Error("Workspace entry is not a file");
      if (info.size > 512 * 1024) throw new Error("File is too large to preview (limit 512 KiB)");
      return Response.json({ path: requested, content: await Bun.file(target).text(), size: info.size, modified: info.mtime.toISOString() }, { headers: { "cache-control": "no-store" } });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Unable to read file" }, { status: 400 });
    }
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
  }

  return serveAsset(url.pathname);
}
