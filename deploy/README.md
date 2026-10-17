# Deployment

The deployment files support a simple systemd installation.

## Layout

The service is installed under:

- Application: `/opt/omp-mcp`
- Persistent service data: `/var/lib/omp-mcp`
- Default OMP working directory: `/var/lib/omp-mcp/workspace`
- systemd unit: `/etc/systemd/system/omp-mcp.service`

The default workspace is created automatically by the application at startup. The deployment Makefile also creates it during installation.

## Install

From the project root:

```bash
sudo make install
sudo make start
```

Or:

```bash
sudo make setup
```

The installer installs the application and production dependencies, creates the persistent workspace, installs the OMP MCP unit plus optional Browser Relay and ydotoold units, and enables only `omp-mcp.service`. The optional units are not started or enabled by default; their failures do not block OMP MCP.

Review `/opt/omp-mcp/.env` before starting the service.

## Service management

```bash
sudo make start
sudo make stop
sudo make restart
sudo make status
sudo make logs
```

The default Make targets manage only `omp-mcp.service`. Optional integrations can be managed independently when needed:

```bash
sudo make start relay
sudo make start ydotoold
sudo make status relay
sudo make logs ydotoold
```

To enable an optional service at boot, use `sudo systemctl enable --now omp-mcp-browser-relay.service` or `sudo systemctl enable --now ydotoold.service`.

## Update

```bash
sudo make update
```

This reinstalls the application files and restarts the service.

## Uninstall

```bash
sudo make uninstall
```

This removes the service and application files but **preserves** `/var/lib/omp-mcp`, including OMP workspaces.

To remove everything, including workspaces:

```bash
sudo make purge
```

Use `purge` only when the workspace data is no longer needed.
