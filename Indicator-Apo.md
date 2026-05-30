# APO

> Absolute Price Oscillator — `EMA(close, fast) − EMA(close, slow)`.
> Like `MACD` but without the signal-EMA.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded around zero |
| Default parameters | `(fast = 12, slow = 26)` |
| Warmup period (`warmup_period()`) | `slow` |
| Interpretation | Positive in uptrends (fast `EMA` leads slow), negative in downtrends. |

## Formula

```
APO_t = EMA(close, fast)_t − EMA(close, slow)_t
```

`fast` must be strictly less than `slow`. Use the existing `MACD`
indicator when you also need the signal line and histogram.

## Parameters

| Name   | Type    | Default | Valid range | Description |
|--------|---------|---------|-------------|-------------|
| `fast` | `usize` | `12`    | `>= 1`, `< slow` | Fast EMA period. |
| `slow` | `usize` | `26`    | `>= 1`, `> fast` | Slow EMA period. |

## Reference

The MACD-line without smoothing — see John Bollinger's *Bollinger on
Bollinger Bands* (and any MACD reference).
