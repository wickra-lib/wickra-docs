// Validate indicator names used in JavaScript/Node.js documentation snippets.
//
// Companion to check_doc_examples.py. The native bindings (Node.js, and WASM
// which shares the same aliases) expose TA-Lib-style names; a doc block calling
// the canonical name (`new ta.AutocorrelationPeriodogram(...)` instead of
// `new ta.AUTOCORRPGRAM(...)`) throws at runtime. This statically checks that
// every `ta.Name` / `wickra.Name` reference in a ```js / ```javascript block is
// an actual export of the installed `wickra` module.
//
// Usage: node scripts/check-doc-examples.mjs [glob ...]   (default: *.md, Indicators/*.md)
// Exit code 1 if any referenced name is unknown.

import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import wickra from 'wickra';

const patterns = process.argv.slice(2);
const globs = patterns.length ? patterns : ['*.md', 'Indicators/*.md'];

const valid = new Set([...Object.keys(wickra), 'Candle']);
const BLOCK = /```(js|javascript)\r?\n([\s\S]*?)```/g;
const REF = /\b(?:ta|wickra)\.([A-Z][A-Za-z0-9_]*)/g;

const files = globs.flatMap((g) => globSync(g));
const missing = [];
let checked = 0;

for (const path of files) {
  const text = readFileSync(path, 'utf8');
  for (const [, , body] of text.matchAll(BLOCK)) {
    for (const m of body.matchAll(REF)) {
      checked += 1;
      if (!valid.has(m[1])) missing.push([path, m[1]]);
    }
  }
}

console.log(`checked ${checked} ta./wickra. references across ${files.length} files`);
const seen = new Set();
const unique = missing.filter(([p, n]) => !seen.has(`${p}|${n}`) && seen.add(`${p}|${n}`));
if (unique.length) {
  console.log(`\n${unique.length} reference(s) to names not exported by wickra:`);
  for (const [p, n] of unique) console.log(`  ${p}: ta.${n}  (not in the Node module)`);
  process.exit(1);
}
console.log('all referenced indicator names exist in the installed wickra module');
