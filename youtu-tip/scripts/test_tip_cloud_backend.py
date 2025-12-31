#!/usr/bin/env python3
"""
Quick sanity script for Tip Cloud gateway.

Workflow:
- Derive a stable-ish device_id (sha256 of hostname+MAC or TIP_DEVICE_SEED).
- Fetch device_token via /v1/device-token.
- Call /v1/chat/completions with model=L=LLM (text) and print response/headers.
- Optionally stream by setting STREAM=1 env.

Environment knobs:
- TIP_CLOUD_BASE_URL: override gateway base (default https://tipapi.wandeer.world/v1)
- TIP_DEVICE_SEED: force a deterministic device_id (good for testing)
- STREAM: when "1", exercise SSE streaming path.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import sys
import time
import uuid
from typing import Iterable

import requests


BASE_URL = os.environ.get("TIP_CLOUD_BASE_URL", "https://tipapi.wandeer.world/v1").rstrip("/")


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def compute_device_id() -> str:
    seed = os.environ.get("TIP_DEVICE_SEED")
    if seed:
        return _hash(seed)
    hostname = platform.node() or "tip-host"
    mac = uuid.getnode()
    return _hash(f"{hostname}-{mac}")


def fetch_device_token(device_id: str) -> str:
    url = f"{BASE_URL}/device-token"
    payload = {
        "device_id": device_id,
        "app_version": os.environ.get("TIP_APP_VERSION", "dev"),
        "platform": f"{platform.system()}-{platform.machine()}",
    }
    resp = requests.post(url, json=payload, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("device_token")
    if not token:
        raise RuntimeError(f"device_token missing in response: {data}")
    return token


def _print_headers(resp: requests.Response) -> None:
    interesting = [
        "X-Device-Id",
        "X-Routed-Model",
        "X-Usage-Prompt-Tokens",
        "X-Usage-Completion-Tokens",
        "X-Usage-Total-Tokens",
    ]
    print("\n[response headers]")
    for key in interesting:
        if key in resp.headers:
            print(f"{key}: {resp.headers[key]}")


def chat_completions(token: str, device_id: str, stream: bool = False) -> None:
    url = f"{BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tip-Device-Id": device_id,
        "Content-Type": "application/json",
    }
    if stream:
        headers["Accept"] = "text/event-stream"
    payload = {
        "model": "VLM",
        "messages": [{"role": "user", "content": "Hello from Tip test script."}],
        "stream": stream,
        "temperature": 0.2,
        "max_tokens": 256,
        "extra_body": {"reasoning": {"enabled": False}},
    }
    if stream:
        with requests.post(url, headers=headers, json=payload, stream=True, timeout=30) as resp:
            resp.raise_for_status()
            _print_headers(resp)
            print("\n[stream chunks]")
            for line in _iter_sse_lines(resp.iter_lines()):
                print(line)
    else:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        _print_headers(resp)
        print("\n[json body]")
        print(json.dumps(resp.json(), ensure_ascii=False, indent=2))


def _iter_sse_lines(chunks: Iterable[bytes]) -> Iterable[str]:
    for raw in chunks:
        if not raw:
            continue
        text = raw.decode("utf-8", errors="replace")
        if text.startswith("data: "):
            yield text[6:]
        else:
            yield text


def main() -> None:
    device_id = compute_device_id()
    print(f"Using device_id: {device_id}")
    start = time.time()
    token = fetch_device_token(device_id)
    print(f"Fetched device_token in {time.time()-start:.2f}s")
    stream = True
    chat_completions(token, device_id, stream=stream)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(f"[error] {exc}", file=sys.stderr)
        sys.exit(1)
