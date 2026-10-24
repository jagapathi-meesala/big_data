"""Shared I/O helpers.

Every filesystem write in the RADAR pipeline goes through this module so that
paths are normalized and restricted to directories inside the project root.
"""
from pathlib import Path
import json

import pandas as pd

from config import PROJECT_ROOT

_ALLOWED_ROOTS = [
    (PROJECT_ROOT / "bigdata").resolve(),
    (PROJECT_ROOT / "datasets").resolve(),
    (PROJECT_ROOT / "paper").resolve(),
]


def _validate(path) -> Path:
    candidate = Path(path).expanduser()
    if ".." in candidate.parts:
        raise ValueError("illegal path segment")
    resolved = candidate.resolve()
    if not any(
        resolved == root or root in resolved.parents for root in _ALLOWED_ROOTS
    ):
        raise PermissionError("path outside allowed project directories")
    if ".." in str(resolved):
        raise ValueError("illegal path segment")
    return resolved


def save_csv(df: pd.DataFrame, path, index: bool = False) -> Path:
    target = _validate(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(target, index=index)
    return target


def read_csv(path, **kwargs) -> pd.DataFrame:
    return pd.read_csv(_validate(path), **kwargs)


def save_json(payload: dict, path) -> Path:
    target = _validate(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    return target


def load_json(path) -> dict:
    return json.loads(_validate(path).read_text(encoding="utf-8"))


def read_text_raw(path) -> str:
    return _validate(path).read_text(encoding="utf-8", errors="ignore")


def save_text(text: str, path) -> Path:
    target = _validate(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")
    return target


def save_parquet(df: pd.DataFrame, path) -> Path:
    target = _validate(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(target, index=False)
    return target


def save_bytes(data: bytes, path) -> Path:
    target = _validate(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return target
