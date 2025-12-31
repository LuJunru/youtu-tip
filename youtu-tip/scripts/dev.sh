#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ELECTRON_CMD=(pnpm --filter electron dev)
PYTHON_CMD=(poetry run uvicorn app.main:app --reload --port 8787)

cleanup() {
  trap - EXIT INT TERM
  if [[ -n "${PY_PID:-}" ]] && ps -p "${PY_PID}" >/dev/null 2>&1; then
    kill "${PY_PID}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${ELECTRON_PID:-}" ]] && ps -p "${ELECTRON_PID}" >/dev/null 2>&1; then
    kill "${ELECTRON_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

cd "${ROOT_DIR}"
"${ELECTRON_CMD[@]}" &
ELECTRON_PID=$!

cd "${ROOT_DIR}/python"
"${PYTHON_CMD[@]}" &
PY_PID=$!

wait "${ELECTRON_PID}"
wait "${PY_PID}"
