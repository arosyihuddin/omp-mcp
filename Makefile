APP_NAME := omp-mcp
SERVICE_NAME := $(APP_NAME).service
INSTALL_DIR := /opt/$(APP_NAME)
DATA_DIR := /var/lib/$(APP_NAME)
WORKSPACE_DIR := $(DATA_DIR)/workspace
SERVICE_USER := pstar7
SERVICE_GROUP := pstar7
SYSTEMD_DIR := /etc/systemd/system

# Override with `make BUN=/path/to/bun setup` when needed.
# Otherwise, resolve Bun from PATH or from the invoking user's ~/.bun install.
BUN ?= $(shell command -v bun 2>/dev/null || true)

ifeq ($(strip $(BUN)),)
ifneq ($(strip $(SUDO_USER)),root)
BUN := $(shell getent passwd $(SUDO_USER) | cut -d: -f6)/.bun/bin/bun
endif
endif

.PHONY: help setup install update uninstall purge start stop restart status logs test typecheck

help:
	@echo "OMP MCP - available targets"
	@echo ""
	@echo "  setup       Install and enable the systemd service"
	@echo "  install     Install the application and systemd service"
	@echo "  update      Reinstall the application and restart the service"
	@echo "  uninstall   Remove the service and application (preserve data)"
	@echo "  purge       Uninstall and remove all service data/workspaces"
	@echo ""
	@echo "  start       Start the systemd service"
	@echo "  stop        Stop the systemd service"
	@echo "  restart     Restart the systemd service"
	@echo "  status      Show systemd service status"
	@echo "  logs        Follow service logs"
	@echo ""
	@echo "  test        Run tests"
	@echo "  typecheck   Run TypeScript typecheck"

setup: install

install:
	@test "$$(id -u)" = "0" || (echo "Run 'make install' as root (use sudo)." && exit 1)
	@command -v $(BUN) >/dev/null 2>&1 || (echo "Bun not found at $(BUN)." && exit 1)
	install -d -o $(SERVICE_USER) -g $(SERVICE_GROUP) -m 0755 $(INSTALL_DIR)
	install -d -o $(SERVICE_USER) -g $(SERVICE_GROUP) -m 0755 $(INSTALL_DIR)/bin
	install -d -o $(SERVICE_USER) -g $(SERVICE_GROUP) -m 0755 $(DATA_DIR)
	install -d -o $(SERVICE_USER) -g $(SERVICE_GROUP) -m 0755 $(WORKSPACE_DIR)
	cp -a src package.json bun.lock tsconfig.json README.md .env.example deploy $(INSTALL_DIR)/
	install -m 0755 $(BUN) $(INSTALL_DIR)/bin/bun
	@if [ ! -f $(INSTALL_DIR)/.env ]; then cp $(INSTALL_DIR)/.env.example $(INSTALL_DIR)/.env; fi
	cd $(INSTALL_DIR) && $(INSTALL_DIR)/bin/bun install --production --frozen-lockfile
	chown -R $(SERVICE_USER):$(SERVICE_GROUP) $(INSTALL_DIR)
	chown -R $(SERVICE_USER):$(SERVICE_GROUP) $(DATA_DIR)
	chmod 0750 $(INSTALL_DIR)
	chmod 0640 $(INSTALL_DIR)/.env
	install -m 0644 deploy/systemd/omp-mcp.service.example $(SYSTEMD_DIR)/$(SERVICE_NAME)
	sed -i 's|^ExecStart=.*|ExecStart=$(INSTALL_DIR)/bin/bun run src/index.ts|' $(SYSTEMD_DIR)/$(SERVICE_NAME)
	systemctl daemon-reload
	systemctl enable $(SERVICE_NAME)
	@echo "Installed $(APP_NAME). Start it with: sudo make start"

update:
	@test "$$(id -u)" = "0" || (echo "Run 'make update' as root (use sudo)." && exit 1)
	@$(MAKE) install
	@$(MAKE) restart

start:
	systemctl start $(SERVICE_NAME)

stop:
	systemctl stop $(SERVICE_NAME)

restart:
	systemctl restart $(SERVICE_NAME)

status:
	systemctl status $(SERVICE_NAME)

logs:
	journalctl -u $(SERVICE_NAME) -f

uninstall:
	@test "$$(id -u)" = "0" || (echo "Run 'make uninstall' as root (use sudo)." && exit 1)
	@echo "[uninstall] Stopping and disabling $(SERVICE_NAME)..."
	@if systemctl cat $(SERVICE_NAME) >/dev/null 2>&1; then \
		systemctl disable --now $(SERVICE_NAME); \
	else \
		echo "[uninstall] Service unit not found (already removed)."; \
	fi
	@echo "[uninstall] Reloading systemd..."
	systemctl daemon-reload
	@echo "[uninstall] Removing $(SYSTEMD_DIR)/$(SERVICE_NAME)..."
	rm -f $(SYSTEMD_DIR)/$(SERVICE_NAME)
	@echo "[uninstall] Removing $(INSTALL_DIR)..."
	rm -rf $(INSTALL_DIR)
	@echo "[uninstall] Verifying..."
	@if [ ! -e $(SYSTEMD_DIR)/$(SERVICE_NAME) ] && [ ! -e $(INSTALL_DIR) ]; then \
		echo "[uninstall] ✓ Service unit and application removed."; \
	else \
		echo "[uninstall] ✗ Cleanup verification failed."; \
		exit 1; \
	fi
	@echo "[uninstall] ✓ Data preserved at $(DATA_DIR)."

purge: uninstall
	@test "$$(id -u)" = "0" || (echo "Run 'make purge' as root (use sudo)." && exit 1)
	@echo "[purge] Removing $(DATA_DIR)..."
	rm -rf $(DATA_DIR)
	@echo "[purge] Verifying..."
	@if [ ! -e $(DATA_DIR) ]; then \
		echo "[purge] ✓ Data and application state removed."; \
	else \
		echo "[purge] ✗ Cleanup verification failed."; \
		exit 1; \
	fi
	@echo "[purge] ✓ $(APP_NAME) is fully purged."

test:
	bun test

typecheck:
	bun run typecheck
