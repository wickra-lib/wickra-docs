#!/usr/bin/env python3
"""Execute every Python doc snippet and fail on the ones that raise.

`check_doc_examples.py` validates that every `ta.<Name>` reference resolves, and
deliberately stops there: many blocks are schematic, looping over a feed that
does not exist, so executing them would raise on undefined names. That leaves a
gap. A snippet can name every symbol correctly and still be wrong -- calling
`update` with the eleven derivatives fields when the indicator takes the three it
uses, feeding a close-only series to something that wants high, low and close,
reaching for `.shape` on a type that has none. Twenty-five such blocks shipped.

This runs them and sorts the failures. A block that fails on an undefined name,
a missing module or a missing file is schematic and does not count. Anything
else -- a wrong argument count, a rejected candle, an attribute the return type
does not have -- is a snippet that raises in a reader's hands, and fails here.

`...` is Python's `Ellipsis`, so a block that elides part of a series raises a
TypeError mentioning it. That is a placeholder, not a defect.

Usage: python scripts/run_doc_snippets.py
Exit code 1 if any snippet fails for a reason a reader would hit.
"""

from __future__ import annotations

import contextlib
import glob
import io
import re
import sys

BLOCK = re.compile(r'```(?:python|py)\r?\n([\s\S]*?)```')
# A schematic block reaches for something this process cannot supply.
SCHEMATIC = (NameError, ModuleNotFoundError, FileNotFoundError, ImportError)


def pages() -> list[str]:
    return sorted(glob.glob('*.md') + glob.glob('Indicators/*.md'))


def main() -> int:
    clean = schematic = 0
    failures: list[tuple[str, int, str]] = []

    for path in pages():
        text = io.open(path, encoding='utf-8').read()
        for match in BLOCK.finditer(text):
            line = text[: match.start()].count('\n') + 2
            source = match.group(1)
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    exec(compile(source, f'{path}:{line}', 'exec'), {'__name__': '__main__'})
                clean += 1
            except SCHEMATIC:
                schematic += 1
            except Exception as exc:  # noqa: BLE001 - the point is to see them all
                if 'ellipsis' in str(exc).lower():
                    schematic += 1
                    continue
                failures.append((path, line, f'{type(exc).__name__}: {exc}'))

    total = clean + schematic + len(failures)
    print(f'ran {total} python snippets: {clean} clean, {len(failures)} failing, '
          f'{schematic} schematic (undefined feed, missing file, or an elided `...`)')

    if failures:
        print('\nsnippets that raise when a reader runs them:', file=sys.stderr)
        for path, line, message in failures:
            print(f'  {path}:{line}\n      {message}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
