# JMA

> Jurik Moving Average — three-stage filter reconstruction of Mark
> Jurik's proprietary adaptive MA.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `(period = 14, phase = 0, power = 2)` |
| Warmup period (`warmup_period()`) | `1` |
| Interpretation | Smoother than `Ema(period)` with less phase lag at the same effective period. |

## Formula

```
beta        = 0.45 · (period − 1) / (0.45 · (period − 1) + 2)
alpha       = beta ^ power
phase_ratio = clamp(phase / 100 + 1.5, 0.5, 2.5)

e0_t  = (1 − alpha) · x_t + alpha · e0_{t-1}
e1_t  = (x_t − e0_t) · (1 − beta) + beta · e1_{t-1}
e2_t  = (e0_t + phase_ratio · e1_t − JMA_{t-1}) · (1 − alpha)²
        + alpha² · e2_{t-1}
JMA_t = JMA_{t-1} + e2_t
```

Jurik Research has never published the original algorithm; the form
above is the widely-circulated three-stage filter reconstruction used
by `pandas-ta`, the TradingView Pine `jma` libraries, and most MQL
ports. Wickra documents this lineage in the indicator's docstring.

## Parameters

| Name     | Type    | Default | Valid range  | Description |
|----------|---------|---------|--------------|-------------|
| `period` | `usize` | `14` (Python) | `>= 1` | Effective smoothing length. `0` errors with `Error::PeriodZero`. |
| `phase`  | `f64`   | `0`     | `[-100, 100]` (clamped) | Phase shift; values outside the range clamp to the boundary `phase_ratio`. |
| `power`  | `u32`   | `2`     | `1..=4`      | Kernel exponent. Outside the range errors with `Error::InvalidPeriod`. |

`Jma::classic()` returns `Jma::new(14, 0.0, 2)`.

## Warmup

`warmup_period() == 1`. The state is seeded by setting
`e0 = JMA = first input`, so the indicator emits a value on the very
first `update()` and a flat input series stays exactly on the
constant from the start.

## Constant series guarantee

With the `e0 = JMA = first input` seed, on a constant input the entire
recurrence collapses: `e0` stays at the constant, `e1` stays at zero,
`e2` stays at zero, so `JMA_t = JMA_{t-1} + 0` is the constant
forever.

## Reference

Mark Jurik, "JMA — Jurik Moving Average", *Technical Analysis of Stocks
& Commodities*, 1999. The three-stage reconstruction above is the
community-standard form used by `pandas-ta`, TradingView, and the
canonical MetaTrader 5 ports.
