#!/usr/bin/env python3
"""beforeReadFile: keep secret files out of the model's context.

Guarded semantics (failClosed:false in hooks.json):
- Missing interpreter / launch failure -> Cursor fails OPEN (a vanished python3
  never bricks all file reads).
- A detected secret file -> explicit `deny` (effective fail-closed on detection).
- An internal error while deciding -> `deny`, rather than risk leaking a file we
  failed to classify.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import read_input, allow, deny, is_sensitive_file  # noqa: E402


def main() -> int:
    try:
        path = read_input().get("file_path") or ""
        sensitive = is_sensitive_file(path)
    except Exception:
        deny(user_message="protect-secrets hook errored; blocked the read defensively.")
        return 0
    if sensitive:
        deny(
            user_message=(
                f"Blocked reading a potential secret file: {os.path.basename(path)}. "
                "Its contents were kept out of the AI context."
            ),
        )
        return 0
    allow()
    return 0


if __name__ == "__main__":
    sys.exit(main())
