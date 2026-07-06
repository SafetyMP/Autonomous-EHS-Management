#!/usr/bin/env python3
"""beforeShellExecution: ask before high-confidence outbound exfil patterns.

Matcher-scoped in hooks.json (curl|wget|scp|nc). Returns permission: ask, not deny,
so legitimate API work can proceed after user review. failClosed:false — secondary net.
"""
from __future__ import annotations

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import read_input, allow, emit, log_event  # noqa: E402

_ASK_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(curl|wget)\b[^|]*@\S", re.IGNORECASE),
     "Uploading a local file via curl/wget (@file)."),
    (re.compile(r"\bscp\b", re.IGNORECASE), "scp may exfiltrate local files."),
    (re.compile(r"\bnc\b[^|]*\s+-e\b", re.IGNORECASE), "netcat with -e is a reverse-shell pattern."),
    (re.compile(r"\b(curl|wget)\b[^|]*(-d|--data|--data-binary)\s+@",
                re.IGNORECASE), "Posting a local file as HTTP body."),
]


def ask(user_message: str, agent_message: str) -> None:
    emit({
        "permission": "ask",
        "user_message": user_message,
        "agent_message": agent_message,
    })


def main() -> int:
    payload = read_input()
    command = (payload.get("command") or "").strip()
    if not command:
        allow()
        return 0
    for pattern, why in _ASK_PATTERNS:
        if pattern.search(command):
            log_event("network", {"decision": "ask", "reason": why, "command": command[:500]}, context=payload)
            ask(
                user_message=f"Review network command: {why}",
                agent_message=(
                    f"A local hook flagged this shell command for review: {why}\n"
                    f"Command: {command}\n"
                    "Proceed only if exfiltration or reverse-shell behavior is intended."
                ),
            )
            return 0
    log_event("network", {"decision": "allow", "command": command[:200]}, context=payload)
    allow()
    return 0


if __name__ == "__main__":
    sys.exit(main())
