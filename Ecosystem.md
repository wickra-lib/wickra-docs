# Ecosystem

Wickra is a family of 24 open-source trading libraries: this indicator core and
twenty-three data-driven products built on it. Every one of them is a Rust core
with a CLI and the same ten-language binding surface — native Python, Node.js
and WASM, plus a C ABI for C, C++, C#, Go, Java and R — released to crates.io,
PyPI, npm, NuGet, Maven Central, the Go module proxy and R-universe from one
pipeline, and checked byte-for-byte across all ten languages by a golden corpus
in every repository.

This site documents the core. Each product has its own site (the Docs column),
its own README and the same layout: `## Use in any language` in every root
README shows the product's handle from Python, and `bindings/<lang>/README.md`
the install line and quick start for each language.

## Core — the indicator engine everything else is built on

| Repository | What it does | Release | Docs |
|---|---|---|---|
| [**wickra**](https://github.com/wickra-lib/wickra) | main library (Rust core + Python / Node.js / WASM bindings + a C ABI for C / C++ / C# / Go / Java / R) | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra/release.svg)](https://github.com/wickra-lib/wickra/releases/latest) | [docs.wickra.org](https://docs.wickra.org) |

## Data — market data in, market data replayed, market data synthesised

| Repository | What it does | Release | Docs |
|---|---|---|---|
| [**wickra-exchange**](https://github.com/wickra-lib/wickra-exchange) | unified market-data + execution across ten crypto exchanges | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-exchange/release.svg)](https://github.com/wickra-lib/wickra-exchange/releases/latest) | [exchange.wickra.org](https://exchange.wickra.org) |
| [**wickra-synth**](https://github.com/wickra-lib/wickra-synth) | deterministic synthetic market microstructure: OHLCV, order book, trades and funding from a single seed | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-synth/release.svg)](https://github.com/wickra-lib/wickra-synth/releases/latest) | [synth.wickra.org](https://synth.wickra.org) |
| [**wickra-timemachine**](https://github.com/wickra-lib/wickra-timemachine) | scrub the whole market like a video — every symbol, full order book, rewound to any moment via deterministic re-fold | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-timemachine/release.svg)](https://github.com/wickra-lib/wickra-timemachine/releases/latest) | [timemachine.wickra.org](https://timemachine.wickra.org) |
| [**wickra-genome**](https://github.com/wickra-lib/wickra-genome) | a vector database of the whole market: every asset a 514-dim live vector, for similarity search, clustering and anomaly detection | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-genome/release.svg)](https://github.com/wickra-lib/wickra-genome/releases/latest) | [genome.wickra.org](https://genome.wickra.org) |
| [**wickra-feature-store**](https://github.com/wickra-lib/wickra-feature-store) | OHLCV and microstructure streams into ML-ready feature matrices over 514 O(1) streaming indicators | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-feature-store/release.svg)](https://github.com/wickra-lib/wickra-feature-store/releases/latest) | [feature-store.wickra.org](https://feature-store.wickra.org) |

## Research — backtest, screen, search, train

| Repository | What it does | Release | Docs |
|---|---|---|---|
| [**wickra-backtest**](https://github.com/wickra-lib/wickra-backtest) | event-driven backtester over the Wickra core | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-backtest/release.svg)](https://github.com/wickra-lib/wickra-backtest/releases/latest) | [backtest.wickra.org](https://backtest.wickra.org) |
| [**wickra-screener**](https://github.com/wickra-lib/wickra-screener) | parallel multi-symbol screening over 514 streaming indicators | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-screener/release.svg)](https://github.com/wickra-lib/wickra-screener/releases/latest) | [screener.wickra.org](https://screener.wickra.org) |
| [**wickra-darwin**](https://github.com/wickra-lib/wickra-darwin) | evolutionary strategy search at millions of backtests per second, mutating and crossing JSON specs across the 514-indicator space | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-darwin/release.svg)](https://github.com/wickra-lib/wickra-darwin/releases/latest) | [darwin.wickra.org](https://darwin.wickra.org) |
| [**wickra-gym**](https://github.com/wickra-lib/wickra-gym) | a Gymnasium-compatible, microstructure-aware backtest environment with O(1) steps for deterministic RL rollouts | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-gym/release.svg)](https://github.com/wickra-lib/wickra-gym/releases/latest) | [gym.wickra.org](https://gym.wickra.org) |
| [**wickra-impact**](https://github.com/wickra-lib/wickra-impact) | the backtester that knows you would have moved the market: agent-based fills on the real historical L2 order book | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-impact/release.svg)](https://github.com/wickra-lib/wickra-impact/releases/latest) | [impact.wickra.org](https://impact.wickra.org) |

## Trust — prove, verify, benchmark and gate what a backtest claims

| Repository | What it does | Release | Docs |
|---|---|---|---|
| [**wickra-verify**](https://github.com/wickra-lib/wickra-verify) | confirm or refute a claimed backtest report against its strategy and data, in ten languages | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-verify/release.svg)](https://github.com/wickra-lib/wickra-verify/releases/latest) | [verify.wickra.org](https://verify.wickra.org) |
| [**wickra-proof**](https://github.com/wickra-lib/wickra-proof) | Proof-of-Backtest: deterministic (spec, data) → report + blake3 hash, recomputable byte-for-byte in ten languages | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-proof/release.svg)](https://github.com/wickra-lib/wickra-proof/releases/latest) | [proof.wickra.org](https://proof.wickra.org) |
| [**wickra-zk**](https://github.com/wickra-lib/wickra-zk) | prove a backtest zero-knowledge — on-chain-verifiable performance without revealing the data or the strategy | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-zk/release.svg)](https://github.com/wickra-lib/wickra-zk/releases/latest) | [zk.wickra.org](https://zk.wickra.org) |
| [**wickra-strategy-ci**](https://github.com/wickra-lib/wickra-strategy-ci) | Jest for trading strategies: golden-pin the report, catch regressions in CI, property-test against fuzzed data | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-strategy-ci/release.svg)](https://github.com/wickra-lib/wickra-strategy-ci/releases/latest) | [strategy-ci.wickra.org](https://strategy-ci.wickra.org) |
| [**wickra-benchmark**](https://github.com/wickra-lib/wickra-benchmark) | reproducible, golden-verified benchmark suite — recompute any (strategy, dataset, report) in ten languages and confirm it byte-for-byte | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-benchmark/release.svg)](https://github.com/wickra-lib/wickra-benchmark/releases/latest) | [benchmark.wickra.org](https://benchmark.wickra.org) |

## Surface — what a trader looks at and talks to

| Repository | What it does | Release | Docs |
|---|---|---|---|
| [**wickra-terminal**](https://github.com/wickra-lib/wickra-terminal) | the trading terminal: a TUI and a browser renderer over the stack | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-terminal/release.svg)](https://github.com/wickra-lib/wickra-terminal/releases/latest) | [terminal.wickra.org](https://terminal.wickra.org) |
| [**wickra-xray**](https://github.com/wickra-lib/wickra-xray) | market-microstructure explorer: footprint, order-book heatmap, liquidation map, funding/OI divergence | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-xray/release.svg)](https://github.com/wickra-lib/wickra-xray/releases/latest) | [xray.wickra.org](https://xray.wickra.org) |
| [**wickra-radar**](https://github.com/wickra-lib/wickra-radar) | perp-universe alert radar: OI delta, funding flip, book imbalance, liquidation clusters, OI/price divergence | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-radar/release.svg)](https://github.com/wickra-lib/wickra-radar/releases/latest) | [radar.wickra.org](https://radar.wickra.org) |
| [**wickra-copilot**](https://github.com/wickra-lib/wickra-copilot) | local market copilot grounded in real order-book, liquidation and funding microstructure | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-copilot/release.svg)](https://github.com/wickra-lib/wickra-copilot/releases/latest) | [copilot.wickra.org](https://copilot.wickra.org) |
| [**wickra-shazam**](https://github.com/wickra-lib/wickra-shazam) | match an asset's current microstructure fingerprint against its entire history | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-shazam/release.svg)](https://github.com/wickra-lib/wickra-shazam/releases/latest) | [shazam.wickra.org](https://shazam.wickra.org) |

## Edge — the core compiled for the browser, the binary, the chip

| Repository | What it does | Release | Docs |
|---|---|---|---|
| [**wickra-compile**](https://github.com/wickra-lib/wickra-compile) | compile a strategy spec into a standalone deployable: a WASM module, a self-contained binary, or a `no_std` artifact | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-compile/release.svg)](https://github.com/wickra-lib/wickra-compile/releases/latest) | [compile.wickra.org](https://compile.wickra.org) |
| [**wickra-embed**](https://github.com/wickra-lib/wickra-embed) | allocation-free, `no_std` streaming indicators for bare-metal and HFT, byte-for-byte identical to the core | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-embed/release.svg)](https://github.com/wickra-lib/wickra-embed/releases/latest) | [embed.wickra.org](https://embed.wickra.org) |
| [**wickra-pico**](https://github.com/wickra-lib/wickra-pico) | the O(1) indicator core running bare-metal on a $5 Raspberry Pi Pico — the LED blinks on the EMA cross | [![release](https://raw.githubusercontent.com/wickra-lib/.github/main/profile/badges/wickra-pico/release.svg)](https://github.com/wickra-lib/wickra-pico/releases/latest) | [pico.wickra.org](https://pico.wickra.org) |

## Sites and demos

- [**live.wickra.org**](https://live.wickra.org) — all 514 indicators over a real Binance feed, in the browser ([wickra-live](https://github.com/wickra-lib/wickra-live))
- [**backtest-live.wickra.org**](https://backtest-live.wickra.org) — the backtester compiled to WebAssembly, an equity curve building bar by bar ([wickra-backtest-live](https://github.com/wickra-lib/wickra-backtest-live))
- [**playground.wickra.org**](https://playground.wickra.org) — one StrategySpec side by side in Python, Rust, JS and Go ([wickra-playground](https://github.com/wickra-lib/wickra-playground))
- [**wickra.org**](https://wickra.org) — the marketing site, with the in-browser demo and the benchmarks ([webpage](https://github.com/wickra-lib/webpage))
- `wickra-<name>-site` — one VitePress site per product at `<name>.wickra.org`; `wickra-<name>-go` — the published Go module of each product, mirrored from `bindings/go/` on every release

## What every repository shares

- **One core, 514 indicators**, every one an O(1) state machine — the same numbers in every product.
- **Data, not code**: a strategy, a scan, a fingerprint, a proof is a JSON spec the Rust core executes, so the same spec runs unchanged from any of the ten languages and produces the same bytes.
- **Identical across all 10 languages, proven**: a golden corpus per repository, replayed through every binding in CI.
- **Zero third-party dependencies in every language**, `unsafe`-forbidden Rust cores, hash-locked CI, SHA-pinned actions, signed commits and build provenance on every release.
- **One release pipeline** — a tag publishes to every registry at once; the org keeps a [version snapshot](https://github.com/wickra-lib/.github/tree/main/versions) of what each registry holds.
