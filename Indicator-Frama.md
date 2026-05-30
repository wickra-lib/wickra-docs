# FRAMA

> Ehlers' Fractal Adaptive Moving Average — an EMA whose smoothing
> constant tracks the fractal dimension of the recent window.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period = 16` (Python) — must be even, `>= 2` |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | Tight tracking in trends (low D), heavy smoothing in chop (high D). |

## Formula

Split the `period`-window of closes into two equal halves. For each:

```
N1 = (max(first  half) − min(first  half)) / (period / 2)
N2 = (max(second half) − min(second half)) / (period / 2)
N3 = (max(window)      − min(window))      / period

D     = (log(N1 + N2) − log(N3)) / log(2)
alpha = exp(−4.6 · (D − 1))            // clamped to [0.01, 1.0]
FRAMA_t = alpha · close_t + (1 − alpha) · FRAMA_{t-1}
```

Wickra uses the **close-only** variant (max/min over closes in each
half), matching the Python `pandas-ta`-style port. The pure Ehlers
paper uses bar `high`/`low`; the close-only form keeps the binding
surface a scalar indicator without giving up the Hurst-flavoured
adaptivity.

## Parameters

| Name     | Type    | Default | Valid range | Description |
|----------|---------|---------|-------------|-------------|
| `period` | `usize` | `16` (Python) | even, `>= 2` | Window length. Odd values error with `Error::InvalidPeriod`. |

## Degenerate windows

If any of `N1`, `N2`, `N3` is zero (a perfectly flat half or window),
`log(0)` is undefined; Wickra falls back to `alpha = 0.01` (the
slowest end of the clamp) so the indicator coasts on its previous
value rather than blowing up.

## Warmup

`warmup_period() == period`. The seed value is the close at the first
full window, then the recurrence iterates from there.

## Constant series guarantee

A flat input has zero ranges in both halves, so `alpha` is clamped to
`0.01` and the EMA recurrence holds the seed exactly.

## Reference

John F. Ehlers, "FRAMA — Fractal Adaptive Moving Average", 2005.
See also `pandas-ta`'s `frama` for the close-only port.
