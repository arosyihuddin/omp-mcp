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

The installer creates the `omp-mcp` system user/group, installs the application, installs production dependencies, creates the persistent workspace, installs the systemd unit, and enables the service.

Review `/opt/omp-mcp/.env` before starting the service.

## Service management

```bash
sudo make start
sudo make stop
sudo make restart
sudo make status
sudo make logs
```

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
