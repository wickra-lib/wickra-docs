# SMI

> William Blau's Stochastic Momentum Index — a doubly-`EMA`-smoothed
> bounded oscillator measuring the close's displacement from the centre
> of the recent high-low range.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | `[−100, 100]` (in practice — by construction, not clamped) |
| Default parameters | `(period = 5, d_period = 3, d2_period = 3)` |
| Warmup period (`warmup_period()`) | `period + d_period + d2_period − 2` |
| Interpretation | Positive in close-near-high markets, negative in close-near-low markets. |

## Formula

Over the lookback `period`, let `HH = max(high)`, `LL = min(low)`,
`C = (HH + LL) / 2`, `R = HH − LL`. The raw displacement is
`d_t = close_t − C_t`. Both `d` and `R` are smoothed twice with `EMA`s:

```
D_smoothed  = EMA(EMA(d, d_period), d2_period)
HL_smoothed = EMA(EMA(R, d_period), d2_period)
SMI         = 100 · D_smoothed / (HL_smoothed / 2)
```

Wickra publishes the `SMI` value only. The optional signal line
`EMA(SMI, k)` is left to the consumer via `Chain` or a manual `Ema`.

## Implementation note

Both EMA stacks are fed on every candle so they warm up in parallel.
Gating the range stack behind the displacement stack would starve it
by one input — the bug-shape of an early prototype caught by the
`warmup_emits_first_value_at_warmup_period` test.

## Parameters

| Name        | Type    | Default | Valid range | Description |
|-------------|---------|---------|-------------|-------------|
| `period`    | `usize` | `5`     | `>= 1`      | High-low lookback. |
| `d_period`  | `usize` | `3`     | `>= 1`      | First-stage EMA period. |
| `d2_period` | `usize` | `3`     | `>= 1`      | Second-stage EMA period. |

Any zero period errors with `Error::PeriodZero`.

## Reference

William Blau, "The Stochastic Momentum Index", *Stocks & Commodities*,
1993.
