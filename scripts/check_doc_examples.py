#!/usr/bin/env python3
"""Validate that every indicator name in a Python doc snippet exists in the
installed `wickra` module.

The deep dives and quickstarts embed runnable Python blocks like
`ta.AUTOCORRPGRAM(...)`. The native bindings expose TA-Lib-style aliases, so a
block calling the canonical name (`ta.AutocorrelationPeriodogram(...)`) raises
AttributeError at runtime. The runnable `examples/` are smoke-tested in CI, but
the snippets embedded in the docs are not — this script closes that gap.

It is a *static name-existence* check, not a full execution: many snippets are
schematic (loops over an undefined feed), so executing them would raise on
undefined names. Checking that every `ta.<Name>` / `wickra.<Name>` reference
resolves to a real export catches the bug class that actually occurs (a
documented name the binding does not expose) without false positives.

Node.js / WASM share the same native aliases and are checked by the sibling
`check-doc-examples.mjs`. The canonical-name bindings (Rust, C#, Go, Java, R,
C/C++) use the deep-dive page name verbatim; validating those needs the crate's
full export list and belongs in the main repo, so they are not gated here.

Usage: python scripts/check_doc_examples.py [glob ...]
Exit code 1 if any referenced name is missing.
"""
from __future__ import annotations

import glob
import re
import sys

import wickra

# `ta.Name` / `wickra.Name` — Name starts uppercase, so method calls
# (`.update`, `.batch`) and helpers like `np.` are skipped.
REF = re.compile(r"\b(?:ta|wickra)\.([A-Z][A-Za-z0-9_]*)")
PY_BLOCK = re.compile(r"```python\r?\n(.*?)```", re.S)

# Valid module members that are not indicators.
EXTRA_OK = {"Candle"}


def main(argv: list[str]) -> int:
    patterns = argv[1:] or ["*.md", "Indicators/*.md"]
    valid = set(dir(wickra)) | EXTRA_OK

    files: list[str] = []
    for pat in patterns:
        files.extend(sorted(glob.glob(pat, recursive=True)))

    missing: list[tuple[str, str]] = []
    checked = 0
    for path in files:
        text = open(path, encoding="utf-8").read()
        for block in PY_BLOCK.findall(text):
            for name in REF.findall(block):
                checked += 1
                if name not in valid:
                    missing.append((path, name))

    print(f"checked {checked} `ta.`/`wickra.` references across {len(files)} files")
    seen: set = set()
    unique = [m for m in missing if not (m in seen or seen.add(m))]
    if unique:
        print(f"\n{len(unique)} reference(s) to names not exported by `wickra`:")
        for path, name in unique:
            print(f"  {path}: ta.{name}  (not in the Python module)")
        return 1
    print("all referenced indicator names exist in the installed `wickra` module")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
