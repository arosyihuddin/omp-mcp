#!/bin/sh
set -eu
env_file="${SETUP_ENV_FILE:?SETUP_ENV_FILE is required}"
api_token="${OMP_SETUP_API_TOKEN:-}"
sudo_key="${OMP_SETUP_SUDO_KEY:-}"
oauth_url="${OMP_SETUP_OAUTH_URL:-}"
oauth_user="${OMP_SETUP_OAUTH_USER:-omp-mcp}"
oauth_password="${OMP_SETUP_OAUTH_PASSWORD:-}"
if [ -z "$api_token" ]; then api_token="$(od -An -N32 -tx1 /dev/urandom | tr -d " \n")"; echo "Generated OMP_API_TOKEN (256-bit)."; fi
if [ -z "$sudo_key" ]; then sudo_key="$(od -An -N32 -tx1 /dev/urandom | tr -d " \n")"; echo "Generated OMP_SUDO_ENCRYPTION_KEY (256-bit)."; fi
[ -n "$oauth_url" ] && { [ -n "$oauth_user" ] && [ -n "$oauth_password" ] || { echo "OAuth username/password cannot be empty when OAuth is enabled." >&2; exit 1; }; }
export OMP_SETUP_API_TOKEN="$api_token" OMP_SETUP_SUDO_KEY="$sudo_key" OMP_SETUP_OAUTH_URL="$oauth_url" OMP_SETUP_OAUTH_USER="$oauth_user" OMP_SETUP_OAUTH_PASSWORD="$oauth_password"
export SETUP_ENV_FILE="$env_file"
"$(dirname "$0")/../bin/bun" run "$(dirname "$0")/write-setup-env.ts"
chmod 0640 "$env_file"
