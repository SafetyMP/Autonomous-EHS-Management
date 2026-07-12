"""Shared helpers for Cursor v2 lifecycle hooks.

Imported by sibling hook scripts. Robust to the working directory Cursor
launches hooks from, since callers add this file's directory to sys.path.

Design law (v2): a guard exists only if `harness redteam` exercises it. Keep
detection logic here so a single corpus can test every consumer.
"""
from __future__ import annotations

import datetime
import json
import os
import re
import sys
import uuid
from pathlib import Path
from typing import Any

CURSOR_HOME = os.path.expanduser("~/.cursor")
LOG_DIR = os.environ.get("CURSOR_HOOK_LOG_DIR", os.path.join(CURSOR_HOME, "logs"))
MEMORY_DIR = os.path.join(CURSOR_HOME, "memory")
_TRACE_ID = os.environ.get("CURSOR_TRACE_ID") or uuid.uuid4().hex


_TRACE_ID = os.environ.get("CURSOR_TRACE_ID") or uuid.uuid4().hex
_HOOK_CONTEXT: dict[str, Any] | None = None


def resolve_workspace_root(
    payload: dict[str, Any] | None = None,
    *,
    cwd: str | None = None,
) -> str:
    """Best-effort repo root for C17 log attribution (IDE + cloud)."""
    if payload:
        for key in ("workspace_roots", "workspaceRoots", "roots"):
            roots = payload.get(key)
            if isinstance(roots, list) and roots:
                root = str(roots[0]).strip()
                if root:
                    return root
        for key in ("cwd", "workingDirectory", "working_directory"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    for env_key in (
        "CURSOR_PROJECT_DIR",
        "CURSOR_WORKSPACE_ROOT",
        "CLAUDE_PROJECT_DIR",
    ):
        value = os.environ.get(env_key)
        if value and value.strip():
            return value.strip()
    if cwd and cwd.strip():
        return cwd.strip()
    return os.getcwd()


def _repo_profile_at(root: Path) -> dict[str, Any] | None:
    path = root / ".harness" / "profile.yaml"
    if not path.is_file():
        return None
    try:
        import yaml  # type: ignore

        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except Exception:  # noqa: BLE001
        return None


def _repo_profile_name_for(root: str) -> str | None:
    try:
        prof = _repo_profile_at(Path(root))
        return prof.get("profile") if prof else None
    except Exception:  # noqa: BLE001
        return None


def read_repo_profile(workspace_root: str | None = None) -> dict[str, Any] | None:
    """Best-effort read of .harness/profile.yaml from a workspace root."""
    root = workspace_root or resolve_workspace_root()
    return _repo_profile_at(Path(root))


def log_event(
    event: str,
    data: dict[str, Any],
    *,
    context: dict[str, Any] | None = None,
) -> None:
    """Append a structured event to today's JSONL session log. Never raises."""
    try:
        ctx = context if context is not None else _HOOK_CONTEXT
        workspace_root = resolve_workspace_root(ctx)
        os.makedirs(LOG_DIR, exist_ok=True)
        day = datetime.date.today().isoformat()
        record = {
            "ts": datetime.datetime.now().isoformat(timespec="seconds"),
            "trace_id": _TRACE_ID,
            "span_id": uuid.uuid4().hex[:16],
            "event": event,
            "workspace_root": workspace_root,
            "profile": _repo_profile_name_for(workspace_root),
            **data,
        }
        if ctx and ctx.get("loop_count") is not None and "loop_count" not in record:
            record["loop_count"] = ctx.get("loop_count")
        with open(os.path.join(LOG_DIR, f"{day}.jsonl"), "a", encoding="utf-8") as fh:
            fh.write(json.dumps(record) + "\n")
    except Exception:
        pass  # observability must never break the agent


def read_input() -> dict[str, Any]:
    """Read and parse the JSON payload Cursor sends on stdin. Never raises."""
    global _HOOK_CONTEXT
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
        _HOOK_CONTEXT = payload if isinstance(payload, dict) else {}
        return _HOOK_CONTEXT
    except Exception:
        _HOOK_CONTEXT = {}
        return {}


def allow() -> None:
    sys.stdout.write('{"permission":"allow"}')
    sys.stdout.flush()


def deny(user_message: str, agent_message: str | None = None) -> None:
    out: dict[str, Any] = {"permission": "deny", "user_message": "Blocked by local safety hook."}
    if agent_message:
        out["agent_message"] = "A local safety hook blocked this action."
    sys.stdout.write(json.dumps(out))
    sys.stdout.flush()


# --- Secret detection -------------------------------------------------------
# High-confidence, low-false-positive patterns for live credentials.
SECRET_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----"), "private key"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AWS access key id"),
    (re.compile(r"\baws_secret_access_key\s*[:=]\s*['\"]?[A-Za-z0-9/+]{40}\b"), "AWS secret access key"),
    (re.compile(r"\bghp_[A-Za-z0-9]{36}\b"), "GitHub personal access token"),
    (re.compile(r"\bgh[ousr]_[A-Za-z0-9]{36}\b"), "GitHub token"),
    (re.compile(r"\bxox[baprs]-[0-9A-Za-z-]{10,}"), "Slack token"),
    (re.compile(r"\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b"), "OpenAI-style API key"),
    (re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"), "Google API key"),
    (re.compile(r"\bglpat-[0-9A-Za-z_-]{20,}\b"), "GitLab personal access token"),
    (re.compile(r"\bsk_live_[0-9A-Za-z]{24,}\b"), "Stripe live secret key"),
    (re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}\b"), "Anthropic API key"),
    (re.compile(r"\bxox[pae]-[0-9A-Za-z-]{10,}"), "Slack token (xoxp/xoxa/xoxe)"),
]


def find_secret(text: str) -> str | None:
    """Return a label for the first high-confidence secret found, else None."""
    if not text:
        return None
    for pattern, label in SECRET_PATTERNS:
        if pattern.search(text):
            return label
    return None


# --- Sensitive-file detection ----------------------------------------------
_ALLOW_SUFFIXES = (".example", ".sample", ".template", ".dist", ".pub")
_SECRET_BASENAMES = {
    ".env", ".env.local", ".env.production", ".env.prod", ".env.staging",
    ".env.test", ".env.test.local",
    ".env.development.local", ".env.production.local",
    "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
    ".netrc", "credentials", "credentials.json", ".npmrc", ".pypirc", ".git-credentials",
}
_SECRET_EXTS = {".pem", ".key", ".p12", ".pfx", ".keystore", ".jks", ".asc", ".ppk"}


def is_sensitive_file(path: str) -> bool:
    if not path:
        return False
    base = os.path.basename(path)
    lower = base.lower()
    if lower.endswith(_ALLOW_SUFFIXES):
        return False
    if base in _SECRET_BASENAMES:
        return True
    if lower.startswith(".env"):
        return True
    _, ext = os.path.splitext(lower)
    if ext in _SECRET_EXTS:
        return True
    return False


# --- Destructive data-layer detection (shared by shell + MCP guards) --------
# Narrow, high-confidence patterns for irreversible data/disk destruction that
# can arrive either as a shell command or as serialized MCP tool arguments
# (e.g. a database MCP running DROP). Fail-open nets, not boundaries.
DATA_DESTRUCTIVE: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(drop\s+database|drop\s+table|truncate\s+table)\b", re.IGNORECASE),
     "Destructive SQL (DROP / TRUNCATE)."),
    (re.compile(r"\bdelete\s+from\s+\w+\s*(;|$)", re.IGNORECASE),
     "Unfiltered DELETE (no WHERE clause)."),
    (re.compile(r"\bmkfs(\.\w+)?\b", re.IGNORECASE), "Filesystem format command."),
    (re.compile(r"\bdd\b.*\bof=/dev/", re.IGNORECASE), "dd writing to a raw device."),
]


def find_data_destructive(text: str) -> str | None:
    if not text:
        return None
    for pattern, why in DATA_DESTRUCTIVE:
        if pattern.search(text):
            return why
    return None


# --- Agent worktree integration guard (shared pattern for guard-shell) ----------
_COMPOSE_RE = re.compile(r"\bdocker\s+compose\b|\bdocker-compose\b", re.IGNORECASE)
_INTEGRATION_SCRIPT_RE = re.compile(
    r"(?:^|[;&|\s])(?:\./)?scripts/"
    r"(?:smoke-test(?:-phase[23])?|deploy-stack|seed|register-debezium-connector|"
    r"wait-outbox-drained|verify-state-twin-pipeline|demo-phase3|verify-worktree-merge|"
    r"register-schemas|submit-flink-job)"
    r"\.sh\b",
    re.IGNORECASE,
)
_WORKTREE_INTEGRATION_MSG = (
    "Integration/stack scripts from an agent worktree (.worktrees/) are blocked — "
    "they hit the main Docker stack and produce false confidence. "
    "Parent runs merge verification from the main repo root "
    "(./scripts/verify-worktree-merge.sh). "
    "Set ALLOW_WORKTREE_COMPOSE=1 only when the user explicitly overrides."
)


def _in_worktree_context(payload: dict[str, Any]) -> bool:
    command = (payload.get("command") or "").strip()
    cwd = (payload.get("cwd") or payload.get("workingDirectory") or "").strip()
    return ".worktrees" in f"{cwd} {command}"


def find_worktree_integration_block(payload: dict[str, Any]) -> str | None:
    """Block Compose and integration smoke/stack scripts from worktree cwd."""
    if os.environ.get("ALLOW_WORKTREE_COMPOSE") == "1":
        return None
    if not _in_worktree_context(payload):
        return None
    command = (payload.get("command") or "").strip()
    if _COMPOSE_RE.search(command) or _INTEGRATION_SCRIPT_RE.search(command):
        return _WORKTREE_INTEGRATION_MSG
    return None


def find_worktree_compose_block(payload: dict[str, Any]) -> str | None:
    """Backward-compatible alias."""
    return find_worktree_integration_block(payload)
