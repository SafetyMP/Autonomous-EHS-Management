#!/usr/bin/env python3
"""Shared threat-model YAML loader (PyYAML optional)."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any


def load_yaml(path: Path) -> dict[str, Any]:
    try:
        import yaml  # type: ignore

        data = yaml.safe_load(path.read_text())
        if not isinstance(data, dict):
            raise ValueError("root must be mapping")
        return data
    except ImportError:
        return _load_yaml_minimal(path.read_text())


def _parse_scalar(val: str) -> Any:
    val = val.strip()
    if not val:
        return ""
    if val in ("true", "True"):
        return True
    if val in ("false", "False"):
        return False
    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
        return val[1:-1]
    if re.fullmatch(r"-?\d+", val):
        return int(val)
    return val


def _load_yaml_minimal(text: str) -> dict[str, Any]:
    """Indent-based parser for threat-model YAML subset."""
    root: dict[str, Any] = {}
    # stack entries: (container, indent, pending_list_item)
    stack: list[tuple[Any, int, dict[str, Any] | None]] = [(root, -1, None)]

    def append_to_container(container: Any, key: str | None, value: Any) -> None:
        if isinstance(container, dict):
            assert key is not None
            container[key] = value
        elif isinstance(container, list):
            if isinstance(value, dict) and not value:
                container.append(value)
            else:
                container.append(value)

    for raw in text.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip())
        line = raw.strip()

        while len(stack) > 1 and indent <= stack[-1][1]:
            stack.pop()

        container, _, pending = stack[-1]

        if line.startswith("- "):
            content = line[2:].strip()
            if not isinstance(container, list):
                raise ValueError(f"list item outside list at indent {indent}: {line}")
            if ":" in content:
                k, v = content.split(":", 1)
                item: dict[str, Any] = {k.strip(): _parse_scalar(v.strip())}
                container.append(item)
                stack.append((item, indent, item))
            else:
                container.append(_parse_scalar(content))
            continue

        if ":" not in line:
            continue
        key, val = line.split(":", 1)
        key = key.strip()
        val = val.strip()

        if val == "":
            if key in ("cells", "deny_cases", "pr_scope"):
                new_val: Any = []
            else:
                new_val = {}
            if isinstance(container, dict):
                container[key] = new_val
            elif isinstance(container, list):
                assert isinstance(stack[-1][2], dict)
                stack[-1][2][key] = new_val
            stack.append((new_val, indent, None if not isinstance(new_val, dict) else new_val))
            continue

        if val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            parsed = [_parse_scalar(x.strip()) for x in inner.split(",") if x.strip()]
            if isinstance(container, dict):
                container[key] = parsed
            elif isinstance(container, list):
                assert isinstance(stack[-1][2], dict)
                stack[-1][2][key] = parsed
            continue

        scalar = _parse_scalar(val)
        if isinstance(container, dict):
            container[key] = scalar
        elif isinstance(container, list):
            assert isinstance(stack[-1][2], dict)
            stack[-1][2][key] = scalar

    return root
