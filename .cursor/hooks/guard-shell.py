#!/usr/bin/env python3
"""beforeShellExecution: deny a narrow set of clearly destructive commands.

Secondary denylist net (failClosed:false), NOT the security boundary — Cursor 2.0's
OS sandbox (workspace-scoped, no internet by default on macOS) is primary. This hook
catches a narrow set of high-confidence destructive patterns hooks can see. A
fail-closed launch config would only add brick-risk without closing unlisted commands.
Tuned to avoid false positives (e.g. `rm -rf node_modules`).
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import read_input, allow, deny, log_event, find_data_destructive, find_worktree_integration_block  # noqa: E402

RULES: list[tuple[str, str]] = [
    (r"\brm\b(?=(?:\s+-\S+)*\s+-[a-zA-Z]*r)(?=(?:\s+-\S+)*\s+-[a-zA-Z]*f)"
     r"(?:\s+-\S+)+\s+['\"]?(/|~|\$HOME|\.|\*)['\"]?/?\*?(?:\s|;|&|$)",
     "Recursive force-delete of a root / home / wildcard path."),
    (r"\brm\b[^|]*--no-preserve-root\s+['\"]?/['\"]?",
     "Recursive delete of root with --no-preserve-root."),
    (r"\bgit\s+push\b.*(--force\b|-f\b|--force-with-lease).*(main|master|origin)\b",
     "Force-push to a protected branch."),
    (r"\bgit\s+push\b.*\b(main|master)\b.*(--force\b|-f\b)",
     "Force-push to a protected branch."),
    (r"\bgit\s+reset\s+--hard\b", "git reset --hard discards work irreversibly."),
    (r"\bgit\s+clean\s+-[a-zA-Z]*f[a-zA-Z]*d", "git clean -fd deletes untracked files."),
    (r"\bchmod\s+-R\s+777\b", "Recursive chmod 777 is dangerously permissive."),
    (r">\s*/dev/(sd|nvme|disk|rdisk)", "Redirecting output onto a raw disk device."),
    (r"\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(sh|bash|zsh)\b", "Piping a remote download into a shell."),
    (r":\(\)\s*\{\s*:\s*\|\s*:?\s*&\s*\}\s*;\s*:", "Fork bomb."),
]
COMPILED = [(re.compile(p, re.IGNORECASE), why) for p, why in RULES]


def find_reason(command: str) -> str | None:
    for pattern, why in COMPILED:
        if pattern.search(command):
            return why
    # Shared data-layer destruction (DROP/TRUNCATE/mkfs/dd) also applies to shell.
    return find_data_destructive(command)


def main() -> int:
    payload = read_input()
    command = (payload.get("command") or "").strip()
    why = find_worktree_integration_block(payload)
    if not why and command:
        why = find_reason(command)
    if why:
        log_event("shell", {"decision": "deny", "reason": why, "command": command[:500]}, context=payload)
        deny(
            user_message=f"Blocked by guard-shell: {why}",
            agent_message=(
                f"A local safety hook blocked this command: {why}\n"
                f"Command: {command}\n"
                "If this is genuinely intended, ask the user to run it manually, "
                "or use a safer, scoped equivalent."
            ),
        )
        return 0
    if command:
        log_event("shell", {"decision": "allow", "command": command[:500]}, context=payload)
    allow()
    return 0


if __name__ == "__main__":
    sys.exit(main())
