#!/usr/bin/env python3
"""Project-opt-in stop hook: block session end until scripts/verify.sh passes."""
from __future__ import annotations

import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import read_input, emit, log_event  # noqa: E402

TIMEOUT = 120
VERIFY_SCRIPT = "scripts/verify.sh"


def _repo_root(payload: dict) -> str:
    for key in ("workspace_roots", "workspaceRoots", "roots"):
        val = payload.get(key)
        if isinstance(val, list) and val:
            return val[0]
    return os.getcwd()


def _had_code_edits(payload: dict) -> bool:
    if payload.get("had_code_edits") or payload.get("hadCodeEdits"):
        return True
    status = payload.get("status") or ""
    return status not in ("", "completed_without_edits")


def main() -> int:
    payload = read_input()
    if os.environ.get("CURSOR_VERIFY_SKIP") == "1":
        emit({})
        return 0

    root = _repo_root(payload)
    verify_path = os.path.join(root, VERIFY_SCRIPT)
    if not os.path.isfile(verify_path):
        emit({})
        return 0

    if not _had_code_edits(payload):
        emit({})
        return 0

    try:
        proc = subprocess.run(
            [verify_path],
            cwd=root,
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
            check=False,
        )
    except subprocess.TimeoutExpired:
        log_event("verify_on_stop", {"decision": "block", "reason": "timeout"})
        emit({
            "followup_message": (
                f"Verification timed out after {TIMEOUT}s running ./{VERIFY_SCRIPT}. "
                "Fix or scope the verify script, then try stopping again."
            ),
        })
        return 0

    if proc.returncode != 0:
        tail = (proc.stderr or proc.stdout or "")[-1500:]
        log_event("verify_on_stop", {
            "decision": "block",
            "exit_code": proc.returncode,
        })
        emit({
            "followup_message": (
                f"./{VERIFY_SCRIPT} failed (exit {proc.returncode}). "
                "Fix failures before stopping.\n\n"
                f"{tail}"
            ),
        })
        return 0

    log_event("verify_on_stop", {"decision": "allow", "exit_code": 0})
    emit({})
    return 0


if __name__ == "__main__":
    sys.exit(main())
