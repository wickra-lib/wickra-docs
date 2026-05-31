// Compile every runnable ```rust code block in the docs against the real
// `wickra` crate, the way rustdoc compiles doctests.
//
// How it works:
//   1. Walk every *.md page and extract fenced ```rust blocks.
//   2. Skip blocks whose info string opts out: `ignore`, `no-test`, `text`,
//      `compile_fail` (we don't assert failures here), or a leading `#` "hidden"
//      marker is honoured the rustdoc way (lines starting with `# ` are kept but
//      the marker is stripped).
//   3. Blocks that already contain `fn main` compile as-is; bare expression /
//      statement blocks and item-only blocks (trait/struct/impl/fn/use ...) are
//      wrapped so they still type-check, exactly like rustdoc.
//   4. Each snippet becomes a `src/bin/snippet_NNNN.rs` in a throwaway cargo
//      crate that depends on the local `wickra` workspace crate, then a single
//      `cargo build` type-checks them all in one pass.
//
// Exit non-zero if any non-ignored snippet fails to compile, printing the
// offending page + snippet. Opt a genuinely-illustrative block out by tagging
// its fence ```rust ignore (and say why in a comment) — never to silence a real
// breakage.
//
// Usage:
//   node scripts/check-rust-snippets.mjs            # uses ../Wickra for the crate
//   WICKRA_CRATE_PATH=/path/to/wickra/crates/wickra node scripts/check-rust-snippets.mjs

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

// Locate the local wickra workspace crate. CI checks the main repo out next to
// this one; locally it lives at ../Wickra. Override with WICKRA_CRATE_PATH.
function resolveCratePath() {
  const override = process.env.WICKRA_CRATE_PATH
  const candidates = [
    override,
    path.resolve(repoRoot, '..', 'Wickra', 'crates', 'wickra'),
    path.resolve(repoRoot, '..', 'wickra', 'crates', 'wickra'),
  ].filter(Boolean)
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'Cargo.toml'))) return c
  }
  throw new Error(
    `could not find the wickra crate. Set WICKRA_CRATE_PATH to <wickra>/crates/wickra. Tried:\n  ${candidates.join('\n  ')}`,
  )
}

// Extract fenced ```rust blocks from one markdown file. Returns
// { lang, flags, code, startLine } records.
function extractRustBlocks(md) {
  const lines = md.split(/\r?\n/)
  const blocks = []
  let inBlock = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Opening fence: ``` followed by an info string (lang + optional flags,
    // e.g. ```rust ignore  or  ```rust,no_run). The closing fence is a bare
    // run of backticks; the inBlock state disambiguates the two.
    if (!inBlock) {
      const open = line.match(/^```+\s*(.*?)\s*$/)
      if (open) {
        const tokens = open[1].toLowerCase().split(/[\s,]+/).filter(Boolean)
        const lang = tokens[0] ?? ''
        inBlock = lang === 'rust' ? { flags: tokens.slice(1), code: [], startLine: i + 1 } : { skip: true }
      }
      continue
    }
    if (/^```+\s*$/.test(line)) {
      if (!inBlock.skip) blocks.push(inBlock)
      inBlock = null
      continue
    }
    if (!inBlock.skip) inBlock.code.push(line)
  }
  return blocks
}

// Reproduce rustdoc's "hidden line" convention: a line that is exactly `#` or
// starts with `# ` is part of the compiled source but hidden in rendered docs.
// Strip the marker so the code compiles.
function stripHiddenMarkers(code) {
  return code
    .map((l) => {
      if (l === '#') return ''
      if (l.startsWith('# ')) return l.slice(2)
      return l
    })
    .join('\n')
}

// Wrap a bare snippet in fn main() the way rustdoc does. If the block already
// defines its own `fn main`, compile it verbatim; otherwise wrap the whole
// thing in a `Result`-returning main. Item definitions (`use`, `fn`, `struct`,
// `trait`, `impl`, `const`, …) are all legal inside a function body in Rust, so
// a single always-wrap rule is both correct and what rustdoc itself does.
function wrapSnippet(code) {
  const body = stripHiddenMarkers(code)
  if (/\bfn\s+main\s*\(/.test(body)) return body
  return `fn main() -> Result<(), Box<dyn std::error::Error>> {\n${body}\n;Ok(())\n}`
}

function main() {
  const cratePath = resolveCratePath()
  const pages = fs
    .readdirSync(repoRoot)
    .filter((f) => f.endsWith('.md'))
    .sort()

  const work = path.join(os.tmpdir(), 'wickra-doctest-' + process.pid)
  fs.rmSync(work, { recursive: true, force: true })
  fs.mkdirSync(path.join(work, 'src', 'bin'), { recursive: true })

  // The docs import all three published crates: the `wickra` facade, the
  // pure-core `wickra-core` (e.g. `wickra_core::Tick`), and the optional
  // `wickra-data` data layer (CSV reader, tick aggregator). Point each at the
  // sibling workspace crate so snippets resolve against the exact local source.
  const cratesDir = path.dirname(cratePath)
  const posix = (p) => p.split(path.sep).join('/')
  fs.writeFileSync(
    path.join(work, 'Cargo.toml'),
    `[package]\nname = "wickra-doctests"\nversion = "0.0.0"\nedition = "2021"\n\n` +
      `[dependencies]\n` +
      `wickra = { path = "${posix(cratePath)}" }\n` +
      `wickra-core = { path = "${posix(path.join(cratesDir, 'wickra-core'))}" }\n` +
      `wickra-data = { path = "${posix(path.join(cratesDir, 'wickra-data'))}", features = ["live-binance"] }\n\n` +
      `[workspace]\n`,
  )

  const index = []
  let n = 0
  let ignored = 0
  for (const page of pages) {
    const md = fs.readFileSync(path.join(repoRoot, page), 'utf8')
    const blocks = extractRustBlocks(md)
    for (const b of blocks) {
      const flags = b.flags
      if (flags.some((f) => ['ignore', 'no-test', 'no_run', 'text', 'compile_fail'].includes(f))) {
        ignored++
        continue
      }
      n++
      const name = 'snippet_' + String(n).padStart(4, '0')
      fs.writeFileSync(path.join(work, 'src', 'bin', name + '.rs'), wrapSnippet(b.code))
      index.push({ name, page, line: b.startLine })
    }
  }

  console.log(`Extracted ${n} runnable rust snippets (${ignored} opted out) from ${pages.length} pages.`)
  console.log(`Crate: ${cratePath}`)
  console.log(`Compiling in ${work} ...`)

  try {
    execFileSync('cargo', ['build', '--bins', '--keep-going', '--message-format=short'], {
      cwd: work,
      stdio: 'inherit',
    })
    console.log(`\nAll ${n} rust snippets compiled.`)
    fs.rmSync(work, { recursive: true, force: true })
  } catch {
    console.error('\nOne or more rust snippets failed to compile. Map src/bin/snippet_NNNN.rs back to its page:')
    for (const r of index) console.error(`  ${r.name} <- ${r.page}:${r.line}`)
    console.error(`\nLeft the failing crate at ${work} for inspection.`)
    process.exit(1)
  }
}

main()
