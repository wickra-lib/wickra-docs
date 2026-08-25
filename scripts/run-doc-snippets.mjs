// Execute every JavaScript doc snippet and fail on the ones that throw.
//
// Companion to run_doc_snippets.py, and the same argument: `check-doc-examples.mjs`
// validates that every `ta.<Name>` reference resolves and deliberately stops
// there, because many blocks are schematic. A snippet can name everything
// correctly and still be wrong -- passing three arguments where `update` takes
// four, ordering them so a candle's high lands below its low, handing an
// indicator the whole derivatives tick when it takes the two fields it uses.
// Five such blocks shipped.
//
// A block that fails on an undefined identifier or a missing module is
// schematic and does not count. The WASM quickstart's blocks are ES modules and
// cannot run under a CommonJS `Function` wrapper, which is the same thing.
// Anything else is a snippet that throws in a reader's hands, and fails here.
//
// Usage: node scripts/run-doc-snippets.mjs
// Exit code 1 if any snippet throws for a reason a reader would hit.

import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

// Resolve `wickra` from the docs repo, not from this file's directory.
const require = createRequire(join(process.cwd(), 'noop.cjs'));

const BLOCK = /```(?:js|javascript)\r?\n([\s\S]*?)```/g;
const SCHEMATIC = /is not defined|Cannot find module|no such file|import statement outside a module|await is only valid/i;

const pages = ['.', 'Indicators'].flatMap((dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => (dir === '.' ? name : `${dir}/${name}`)),
);

let clean = 0;
let schematic = 0;
const failures = [];

for (const page of pages) {
  const text = readFileSync(page, 'utf8');
  for (const match of text.matchAll(BLOCK)) {
    const line = text.slice(0, match.index).split('\n').length + 1;
    try {
      // Snippets are written as CommonJS and print with `console.log`; give them
      // a real `require` and a silent console.
      new Function('require', 'console', match[1])(require, { log() {}, error() {}, warn() {} });
      clean += 1;
    } catch (err) {
      const message = `${err.constructor.name}: ${err.message}`.split('\n')[0];
      if (SCHEMATIC.test(message)) schematic += 1;
      else failures.push(`  ${page}:${line}\n      ${message}`);
    }
  }
}

const total = clean + schematic + failures.length;
console.log(
  `ran ${total} js snippets: ${clean} clean, ${failures.length} failing, ` +
    `${schematic} schematic (undefined feed, missing module, or an ES module block)`,
);

if (failures.length) {
  console.error('\nsnippets that throw when a reader runs them:');
  console.error(failures.join('\n'));
  process.exit(1);
}
