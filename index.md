---
layout: home

hero:
  name: Wickra
  text: Streaming-first technical indicators
  tagline: One Rust core. The same O(1) update for live ticks and backtests. Python, Node, WASM, and Rust bindings — install-free.
  image:
    src: /wickra-mark.svg
    alt: Wickra
  actions:
    - theme: brand
      text: Get started
      link: /Quickstart-Rust
    - theme: alt
      text: Indicators overview
      link: /Indicators-Overview
    - theme: alt
      text: Overview
      link: /overview

features:
  - title: 214 indicators, 16 families
    details: Moving averages, momentum, trend, volatility, bands, volume, statistics, Ehlers/DSP, pivots, DeMark, Ichimoku, candlesticks, market profile, and risk/performance.
  - title: Same code, live and backtest
    details: Every indicator is an O(1) state machine. The update call in your live loop is the exact same code path that drives the historical backtest — no drift.
  - title: Install-free everywhere
    details: pip install wickra · cargo add wickra · npm install wickra. No system compilers, no C dependencies, no headers. The Rust core forbids unsafe.
  - title: Streaming or batch
    details: Feed one value at a time, or a whole array via BatchExt. Chain indicators with the Chain combinator. Identical numbers either way.
---

<!-- markdownlint-disable-file MD041 -- VitePress `layout: home` page: the hero is the heading, so there is no leading H1. -->

<div class="wk-badges" style="text-align: center; max-width: 1140px; margin: 0 auto; padding: 24px 24px 8px;">

[![CI](https://github.com/wickra-lib/wickra/actions/workflows/ci.yml/badge.svg)](https://github.com/wickra-lib/wickra/actions/workflows/ci.yml)
[![CodeQL](https://github.com/wickra-lib/wickra/actions/workflows/codeql.yml/badge.svg)](https://github.com/wickra-lib/wickra/actions/workflows/codeql.yml)
[![codecov](https://codecov.io/gh/wickra-lib/wickra/branch/main/graph/badge.svg)](https://codecov.io/gh/wickra-lib/wickra)
[![GitHub release](https://img.shields.io/github/v/release/wickra-lib/wickra?logo=github&color=green)](https://github.com/wickra-lib/wickra/releases/latest)
[![crates.io](https://img.shields.io/crates/v/wickra.svg?logo=rust&color=orange)](https://crates.io/crates/wickra)
[![PyPI](https://img.shields.io/pypi/v/wickra.svg?logo=pypi&color=blue)](https://pypi.org/project/wickra/)
[![npm](https://img.shields.io/npm/v/wickra.svg?logo=npm&color=red)](https://www.npmjs.com/package/wickra)
[![License: PolyForm-NC](https://img.shields.io/badge/license-PolyForm--NC--1.0.0-purple)](https://github.com/wickra-lib/wickra/blob/main/LICENSE)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/wickra-lib/wickra/badge)](https://scorecard.dev/viewer/?uri=github.com/wickra-lib/wickra)
[![Build provenance](https://img.shields.io/badge/provenance-attested-brightgreen?logo=github)](https://github.com/wickra-lib/wickra/attestations)

</div>
