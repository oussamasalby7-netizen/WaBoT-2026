#!/bin/sh
set -eu

PORT="${PORT:-6001}"
export LARAVEL_WEBSOCKETS_PORT="${LARAVEL_WEBSOCKETS_PORT:-$PORT}"

exec php artisan websockets:serve --host=0.0.0.0 --port="$PORT"
