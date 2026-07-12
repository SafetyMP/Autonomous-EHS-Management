#!/usr/bin/env python3
"""beforeSubmitPrompt: stop a prompt that contains a live credential.

Blocks only on high-confidence secret patterns to avoid friction.
Output uses {"continue": bool} per the beforeSubmitPrompt contract.

Guarded semantics (failClosed:false): launch failure -> fail OPEN; a detected
secret or an internal scan error -> {"continue": false}.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import read_input, emit, find_secret  # noqa: E402


def main() -> int:
    try:
        prompt = read_input().get("prompt") or ""
        label = find_secret(prompt)
    except Exception:
        emit({
            "continue": False,
            "user_message": "scan-prompt hook errored; blocked submission defensively.",
        })
        return 0
    if label:
        emit({
            "continue": False,
            "user_message": (
                f"Submission blocked: your prompt appears to contain a {label}. "
                "Remove or redact the secret and resend. "
                "(Rotate it if it was ever exposed.)"
            ),
        })
        return 0
    emit({"continue": True})
    return 0


if __name__ == "__main__":
    sys.exit(main())
