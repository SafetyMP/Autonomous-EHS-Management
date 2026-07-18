#!/usr/bin/env python3
"""beforeMCPExecution: observe every MCP tool call and block plainly
destructive ones (NEW in v2).

Why this exists: MCP tools can mutate real systems (databases, cloud, files)
and their *output* is untrusted data, never instructions. This hook is a
fail-open net (failClosed:false): it logs every MCP call for observability and
denies only a narrow, high-confidence set of irreversible data-layer actions
(DROP / TRUNCATE / unfiltered DELETE / mkfs / dd-to-device) found in the
serialized tool arguments. It is NOT a security boundary.

Unknown servers default to read-only: shell/exec tools are denied unless the
server is listed in ~/.cursor/mcp-trust.json mutating_allowed.

Input contract is read defensively because field names vary across MCP servers;
we scan the whole serialized payload rather than assume a single arg key.
Output: {"permission": "allow"|"deny"} per the beforeMCPExecution contract.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import CURSOR_HOME, read_input, allow, deny, log_event, find_data_destructive  # noqa: E402

_EXEC_TOOL_RE = re.compile(
    r"\b(run|execute|exec|bash|shell|command|cmd)\b", re.IGNORECASE
)
_TRUST_PATH = os.path.join(CURSOR_HOME, "mcp-trust.json")


def _load_trust() -> dict:
    try:
        with open(_TRUST_PATH, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {"read_only_default": True, "mutating_allowed": []}


def _summary(payload: dict) -> dict:
    server = (
        payload.get("mcp_server_name") or payload.get("server_name")
        or payload.get("server") or payload.get("serverName") or ""
    )
    out = {
        "tool": payload.get("tool_name") or payload.get("tool")
        or payload.get("toolName") or "",
        "server": server,
    }
    if not server:
        out["payload_keys"] = sorted(payload.keys())
    return out


def _unknown_exec_block(payload: dict) -> str | None:
    trust = _load_trust()
    if not trust.get("read_only_default", True):
        return None
    server = (
        payload.get("mcp_server_name") or payload.get("server_name")
        or payload.get("server") or payload.get("serverName") or ""
    )
    allowed = set(trust.get("mutating_allowed") or [])
    if server in allowed:
        return None
    tool = (
        payload.get("tool_name") or payload.get("tool")
        or payload.get("toolName") or ""
    )
    if _EXEC_TOOL_RE.search(tool):
        return (
            f"MCP exec tool '{tool}' on server '{server or 'unknown'}' blocked "
            "(read_only_default). Add server to mcp-trust.json mutating_allowed if intended."
        )
    return None


def main() -> int:
    payload = read_input()
    try:
        blob = json.dumps(payload, default=str)
    except Exception:
        blob = str(payload)

    summary = _summary(payload)
    why = find_data_destructive(blob) or _unknown_exec_block(payload)
    if why:
        log_event("mcp", {"decision": "deny", "reason": why, **summary}, context=payload)
        deny(
            user_message=f"Blocked by guard-mcp: {why}",
            agent_message=(
                f"A local safety hook blocked this MCP tool call: {why}\n"
                "If this is genuinely intended, scope it (add a WHERE clause / "
                "target a specific resource) or ask the user to run it manually."
            ),
        )
        return 0

    log_event("mcp", {"decision": "allow", **summary}, context=payload)
    allow()
    return 0


if __name__ == "__main__":
    sys.exit(main())
