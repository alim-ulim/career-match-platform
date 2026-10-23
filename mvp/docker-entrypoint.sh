#!/bin/sh
set -eu
umask 077
# The mounted volume can initially belong to root. Only initialize the app's
# fixed subdirectory, then permanently drop privileges for the application.
if [ "$(id -u)" = "0" ]; then
  if [ "${DATA_DIR:-}" != "/data/ulim" ]; then
    echo 'Docker DATA_DIR must be /data/ulim (mount the volume at /data).' >&2
    exit 1
  fi
  if [ -L /data/ulim ]; then
    echo 'Refusing a symbolic link as the application data directory.' >&2
    exit 1
  fi
  mkdir -p /data/ulim
  chown -Rh node:node /data/ulim
  chmod 700 /data/ulim
  exec su-exec node:node "$@"
fi
exec "$@"
