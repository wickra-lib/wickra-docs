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
  - title: 242 indicators, 17 families
    details: Moving averages, momentum, trend, volatility, bands, volume, statistics, Ehlers/DSP, pivots, DeMark, Ichimoku, candlesticks, market profile, and risk/performance.
  - title: Same code, live and backtest
    details: Every indicator is an O(1) state machine. The update call in your live loop is the exact same code path that drives the historical backtest — no drift.
  - title: Install-free everywhere
    details: pip install wickra · cargo add wickra · npm install wickra. No system compilers, no C dependencies, no headers. The Rust core forbids unsafe.
  - title: Streaming or batch
    details: Feed one value at a time, or a whole array via BatchExt. Chain indicators with the Chain combinator. Identical numbers either way.
---
