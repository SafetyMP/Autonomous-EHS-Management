#!/usr/bin/env python3
"""Execute tier-3 deny cases from specs/threat-model.yaml (v1 / v1.1)."""
from __future__ import annotations

import argparse
import fnmatch
import importlib.util
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


def load_yaml(path: Path) -> dict[str, Any]:
    helper = Path(__file__).resolve().parent / "_threat_model_yaml.py"
    if helper.is_file():
        spec = importlib.util.spec_from_file_location("_threat_model_yaml", helper)
        assert spec and spec.loader
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod.load_yaml(path)
    try:
        import yaml  # type: ignore

        data = yaml.safe_load(path.read_text())
        if not isinstance(data, dict):
            raise ValueError("root must be mapping")
        return data
    except ImportError as exc:
        raise RuntimeError("missing scripts/_threat_model_yaml.py and PyYAML") from exc


def git_changed_files(base: str, head: str, root: Path) -> list[str]:
    for cmd in (
        ["git", "diff", "--name-only", f"{base}...{head}"],
        ["git", "diff", "--name-only", base, head],
        ["git", "diff", "--name-only", "HEAD~1", "HEAD"],
    ):
        try:
            out = subprocess.check_output(cmd, cwd=root, text=True, stderr=subprocess.DEVNULL)
            files = [ln.strip() for ln in out.splitlines() if ln.strip()]
            if files:
                return files
        except subprocess.CalledProcessError:
            continue
    return []


def glob_match(path: str, pattern: str) -> bool:
    path = path.replace("\\", "/")
    pattern = pattern.replace("\\", "/")
    if pattern.endswith("/**"):
        return fnmatch.fnmatch(path, pattern[:-3]) or path.startswith(pattern[:-3])
    return fnmatch.fnmatch(path, pattern)


def cell_matches_pr(cell: dict[str, Any], changed: list[str]) -> bool:
    scopes = cell.get("pr_scope") or []
    if not scopes:
        return False
    for ch in changed:
        for pat in scopes:
            if glob_match(ch, pat):
                return True
    return False


def select_cases(model: dict[str, Any], scope: str, changed: list[str]) -> list[dict[str, Any]]:
    cells = {c["id"]: c for c in model.get("cells") or [] if isinstance(c, dict) and "id" in c}
    selected: list[dict[str, Any]] = []
    for case in model.get("deny_cases") or []:
        if not isinstance(case, dict) or "id" not in case:
            continue
        if scope == "full":
            selected.append(case)
            continue
        if case.get("baseline"):
            selected.append(case)
            continue
        cell_id = case.get("cell")
        cell = cells.get(cell_id, {})
        if cell.get("baseline"):
            selected.append(case)
            continue
        if cell_id in cells and cell_matches_pr(cell, changed):
            selected.append(case)
    return selected


def resolve_auth(name: str | None, auth_cfg: dict[str, Any], root: Path) -> dict[str, str]:
    if not name or name == "anonymous":
        return {}
    spec = auth_cfg.get(name)
    if not spec:
        if name.startswith("Bearer ") or name.startswith("bearer "):
            return {"Authorization": name if name.startswith("Bearer") else f"Bearer {name[7:]}"}
        env_val = os.environ.get(name, "")
        if env_val:
            return {"Authorization": env_val if env_val.startswith("Bearer ") else f"Bearer {env_val}"}
        raise RuntimeError(f"unknown auth fixture: {name}")
    if isinstance(spec, str):
        val = os.environ.get(spec, spec)
        if val.startswith("Bearer "):
            return {"Authorization": val}
        return {"Authorization": f"Bearer {val}"}
    if not isinstance(spec, dict):
        raise RuntimeError(f"invalid auth spec for {name}")
    if "env" in spec:
        val = os.environ.get(str(spec["env"]), "")
        if not val:
            raise RuntimeError(f"auth env empty: {spec['env']}")
        return {"Authorization": val if val.startswith("Bearer ") else f"Bearer {val}"}
    if "bearer" in spec:
        val = str(spec["bearer"])
        return {"Authorization": val if val.startswith("Bearer ") else f"Bearer {val}"}
    if "command" in spec:
        out = subprocess.check_output(str(spec["command"]), shell=True, cwd=root, text=True).strip()
        return {"Authorization": f"Bearer {out}" if not out.startswith("Bearer ") else out}
    if "cookie" in spec:
        val = os.environ.get(str(spec["cookie"]), str(spec["cookie"]))
        return {"Cookie": val}
    if "cookie_command" in spec:
        out = subprocess.check_output(str(spec["cookie_command"]), shell=True, cwd=root, text=True).strip()
        return {"Cookie": out}
    raise RuntimeError(f"auth fixture {name} has no env/command/bearer/cookie")


def build_url(base: str, fixture: dict[str, Any], cell: dict[str, Any]) -> str:
    path = str(fixture.get("path") or cell.get("path") or "/")
    subject = fixture.get("subject")
    purpose = fixture.get("purpose")
    if subject is not None:
        path = path.replace("{subject}", str(subject))
    if purpose is not None:
        path = path.replace("{purpose}", str(purpose))
    if "query" in fixture:
        q = str(fixture["query"])
        path = f"{path}?{q}" if "?" not in path else f"{path}&{q}"
    if "query_override" in fixture:
        key, _, val = str(fixture["query_override"]).partition("=")
        sep = "&" if "?" in path else "?"
        path = f"{path}{sep}{key}={val}"
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return base.rstrip("/") + ("/" + path.lstrip("/") if not path.startswith("/") else path)


def run_setup(model: dict[str, Any], root: Path) -> None:
    runtime = model.get("runtime") or {}
    setup = runtime.get("setup")
    if not setup:
        return
    script = root / str(setup)
    if not script.is_file():
        raise RuntimeError(f"runtime.setup not found: {setup}")
    subprocess.check_call(["bash", str(script)], cwd=root)


def run_http_case(
    case: dict[str, Any],
    cell: dict[str, Any],
    base: str,
    auth_cfg: dict[str, Any],
    root: Path,
) -> None:
    fixture = case.get("fixture") or {}
    expect = case.get("expect") or {}
    method = str(fixture.get("method") or cell.get("method") or "GET").upper()
    url = build_url(base, fixture, cell)
    headers: dict[str, str] = {}
    auth_name = fixture.get("auth")
    principal = case.get("principal")
    if auth_name is None and principal not in (None, "anonymous"):
        auth_name = principal
    headers.update(resolve_auth(str(auth_name) if auth_name else None, auth_cfg, root))
    extra_headers = fixture.get("headers") or {}
    if isinstance(extra_headers, dict):
        for k, v in extra_headers.items():
            headers[str(k)] = str(v)
    body = fixture.get("body")
    data = None
    if body is not None:
        headers.setdefault("Content-Type", "application/json")
        data = body if isinstance(body, (bytes, bytearray)) else str(body).encode()
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        status = exc.code
        raw = exc.read().decode("utf-8", errors="replace")
    expected_status = expect.get("status")
    if expected_status is not None and status != expected_status:
        raise AssertionError(f"{case['id']}: expected HTTP {expected_status}, got {status}: {raw[:500]}")
    reason = expect.get("reason_substring")
    if reason and reason not in raw:
        raise AssertionError(f"{case['id']}: body missing {reason!r}: {raw[:500]}")
    expect_json = expect.get("json")
    if expect_json:
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError as exc:
            raise AssertionError(f"{case['id']}: invalid JSON: {raw[:500]}") from exc
        if isinstance(expect_json, dict):
            for k, v in expect_json.items():
                if parsed.get(k) != v:
                    raise AssertionError(f"{case['id']}: json[{k}]={parsed.get(k)!r}, want {v!r}")


def run_exec_case(case: dict[str, Any], cell: dict[str, Any], root: Path) -> None:
    fixture = case.get("fixture") or {}
    expect = case.get("expect") or {}
    command = str(fixture.get("command") or cell.get("path") or "")
    if not command:
        raise RuntimeError(f"{case['id']}: EXEC case missing command")
    cwd_rel = fixture.get("cwd", ".")
    cwd = root / str(cwd_rel)
    cwd.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(command, shell=True, cwd=cwd, capture_output=True, text=True)
    expected = expect.get("status", 1)
    if proc.returncode != expected:
        raise AssertionError(
            f"{case['id']}: expected exit {expected}, got {proc.returncode}\n"
            f"stdout: {proc.stdout[:500]}\nstderr: {proc.stderr[:500]}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="Run adversarial deny cases from specs/threat-model.yaml")
    parser.add_argument("--scope", choices=("full", "pr"), default="full")
    parser.add_argument("--yaml", default="specs/threat-model.yaml")
    parser.add_argument("--root", default=".")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    yaml_path = root / args.yaml
    if not yaml_path.is_file():
        print(f"MISSING: {yaml_path}", file=sys.stderr)
        return 1

    model = load_yaml(yaml_path)
    schema = str(model.get("schema", ""))
    if "threat-model/v1" not in schema:
        print(f"BAD SCHEMA: {schema}", file=sys.stderr)
        return 1

    run_setup(model, root)

    runtime = model.get("runtime") or {}
    base_env = str(runtime.get("base_url_env") or "ADVERSARIAL_BASE_URL")
    base = os.environ.get(base_env) or str(runtime.get("default_base_url") or "http://localhost:8080")

    base_aliases = runtime.get("base_url_aliases") or {}
    if isinstance(base_aliases, dict):
        for key, val in base_aliases.items():
            if key not in os.environ:
                os.environ[key] = str(val)

    auth_cfg = model.get("auth") or {}
    cells = {c["id"]: c for c in model.get("cells") or [] if isinstance(c, dict) and "id" in c}

    base_sha = os.environ.get("GITHUB_BASE_SHA", "")
    head_sha = os.environ.get("GITHUB_HEAD_SHA", "HEAD")
    changed: list[str] = []
    if args.scope == "pr":
        if base_sha:
            changed = git_changed_files(base_sha, head_sha, root)
        else:
            changed = git_changed_files("origin/main", "HEAD", root)
        print(f"adversarial: pr scope — {len(changed)} changed file(s)")

    cases = select_cases(model, args.scope, changed)
    if not cases:
        print("adversarial: no deny cases selected for scope", file=sys.stderr)
        return 1

    print(f"adversarial: running {len(cases)} deny case(s) scope={args.scope}")
    for case in cases:
        cid = case["id"]
        cell_id = case.get("cell")
        cell = cells.get(cell_id, {})
        method = str(cell.get("method") or "GET").upper()
        print(f"\n== adversarial: {cid} ==")
        if method == "EXEC":
            run_exec_case(case, cell, root)
        else:
            cell_base = base
            cell_base_key = cell.get("base_url_env")
            if cell_base_key:
                cell_base = os.environ.get(str(cell_base_key), cell_base)
            run_http_case(case, cell, cell_base, auth_cfg, root)
        print(f"  ok")

    print("\nadversarial: ok — tier-3 deny cases passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
