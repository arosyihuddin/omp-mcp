# OMP-MCP — Architecture

## Purpose

OMP-MCP exposes the Oh My Pi (OMP) agent runtime and native tools to MCP-compatible clients. It supports MCP transports and provides an authenticated HTTP control API used by OMP Control. The dashboard frontend is maintained separately in the OMP-Control repository.

## High-level structure

```text
MCP client
  └─ MCP transport (STDIO and/or Streamable HTTP)
       └─ MCP server + tool registration
            ├─ OMP agent/session tools (omp_*)
            ├─ native OMP tools
            └─ OMP-MCP built-ins
                 ├─ filesystem/workspace
                 ├─ terminal and computer control
                 ├─ tool permissions and approvals
                 └─ tunnel management

OMP Control
  └─ authenticated HTTP control API (/api/*)
       ├─ tool catalog, exposure, permissions, custom rules
       ├─ logs, approvals, dashboard events (SSE)
       ├─ workspace and terminal APIs
       ├─ root-command configuration
       └─ Cloudflare Tunnel process lifecycle
```

## Runtime entry points

- `src/index.ts`: application startup, MCP transport selection, Bun HTTP server, HTTP API/auth routing, terminal WebSocket upgrade, and graceful shutdown.
- `src/mcp/server.ts`: creates the MCP server and registers tools.
- `src/mcp/tools/`: tool registration and implementations, including built-ins and dynamically discovered native OMP tools.
- `src/app/http.ts`: MCP Streamable HTTP session handling.
- `src/dashboard/index.ts`: authenticated runtime/control API consumed by OMP Control; it does not serve the dashboard frontend.
- `src/dashboard/events.ts`: server-sent dashboard events.
- `src/control-plane/tools/`: tool catalog metadata, exposure, permission policies, and custom rule validation/evaluation.
- `src/control-plane/db/`: SQLite schema and Drizzle migrations.
- `src/approval/`: pending tool approval lifecycle.
- `src/terminal/`: terminal session management and WebSocket I/O.
- `src/tunnels/manager.ts`: host-local Cloudflare Quick Tunnel process management and tunnel events.
- `src/lib/http-auth.ts` and `src/lib/oauth.ts`: internal API authentication and optional OAuth flows.
- `src/lib/config.ts`: environment configuration.
- `deploy/systemd/` and `Makefile`: service installation and lifecycle.

## Transport and HTTP surfaces

The MCP transport is selected by `MCP_TRANSPORT`:

- `stdio`: MCP over stdin/stdout.
- `http`: MCP Streamable HTTP.
- `both`: run both transports in one process.

For HTTP, `MCP_HTTP_HOST`, `MCP_HTTP_PORT`, and `MCP_HTTP_PATH` configure the listener. The common default path is `/mcp`; the code-level default host/port may differ from the systemd deployment defaults, so check the active environment when troubleshooting.

The same HTTP server hosts authenticated runtime/control APIs and the terminal WebSocket endpoint. OAuth endpoints are handled separately from the internal Bearer-token-protected APIs.

## State and persistence

- The control-plane SQLite database is created at `$OMP_DATA_DIR/control-plane.db`; `OMP_DATA_DIR` defaults to `/var/lib/omp-mcp` in application code.
- Drizzle migrations are applied at startup.
- Tool configurations, permission groups, call logs, workspace preferences, editor/session metadata, and OAuth records are persisted in the control database according to the schema.
- Some runtime state is intentionally process-local. In particular, active tunnel process records and terminal process handles do not survive a process restart as live processes.

## Tool catalog and execution policy

OMP-MCP is the source of truth for `GET /api/tools`. The catalog combines registered OMP-MCP built-ins with native tools available from the installed OMP runtime.

- Exposure controls whether a tool is available to MCP clients.
- Permission policies determine whether a tool call is allowed, requires approval, or is blocked.
- Custom permission rules are validated, normalized, persisted, and evaluated by the runtime before execution.
- The dashboard UI is not a security boundary; enforce policy on the server.
- Root-command rules apply to the opt-in high-risk `sudo_exec` capability. They use exact command and argument matching, and seeded examples are disabled by default.

## Authentication and trust boundaries

- Internal OMP Control/runtime API requests use `OMP_API_TOKEN` Bearer authentication.
- Optional remote MCP OAuth is configured separately with `MCP_PUBLIC_URL`, `OMP_OAUTH_USERNAME`, and `OMP_OAUTH_PASSWORD`.
- OAuth access tokens are not OMP Control browser sessions.
- Treat tool input, workspace paths, upstream requests, browser-relay sessions, and remote client metadata as untrusted.
- Keep credentials, tokens, OAuth codes, and collaboration links out of logs and API responses.
- Bind tunnel targets to permitted loopback HTTP(S) URLs; do not turn tunnel management into an arbitrary network proxy.

## Eventing and lifecycle

- Dashboard updates use server-sent events where supported.
- Terminal I/O uses WebSockets.
- MCP HTTP sessions are tracked and closed during graceful shutdown.
- Shutdown stops the HTTP server, stops managed tunnels, closes MCP HTTP sessions, and closes the MCP server.

## Change guidance

For runtime or security behavior, implement and test the authoritative change in OMP-MCP. Update the OMP Control UI/client only as needed to expose that behavior. When changing an API route, update its authentication expectations, method validation, tests, and README documentation. When changing persistence, add a migration rather than relying on an undocumented manual database change.
