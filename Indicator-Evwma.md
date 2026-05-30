# EVWMA

> Elastic Volume-Weighted Moving Average — Fries' "elastic" recurrence
> whose smoothing weight is the bar's volume relative to the running
> window-volume.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `Candle` (uses `close` and `volume`) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period = 20` (Python) |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | Volume-mass adaptive average: dominant-volume bars pull the average toward their close. |

## Formula

```
V_sum_t  = Σ volume_i over the last `period` candles
EVWMA_t  = ((V_sum_t − volume_t) · EVWMA_{t-1} + volume_t · close_t) / V_sum_t
```

A bar whose volume is small compared to `V_sum` barely moves the
average; a bar whose volume dominates the window pulls EVWMA strongly
toward that bar's close. Unlike `Vwma` (a per-bar weighted *mean*),
EVWMA's recurrence makes the weighting *elastic* over time — past bars
keep mattering through the running `EVWMA_{t-1}` term.

## Parameters

| Name     | Type    | Default | Valid range | Description |
|----------|---------|---------|-------------|-------------|
| `period` | `usize` | `20` (Python) | `>= 1` | Volume-window length. `0` errors with `Error::PeriodZero`. |

## Inputs / Outputs

```rust
impl Indicator for Evwma {
    type Input = Candle;
    type Output = f64;
}
```

Python `wickra.EVWMA(period=20)`: `update(candle)` returns
`float | None`; `batch(close, volume)` returns a 1-D
`numpy.ndarray` (NaN during warmup).
Node `new wickra.EVWMA(period)`: `update(close, volume)` returns
`number | null`; `batch(close, volume)` returns an `Array<number>`
with `NaN` for warmup.

## Warmup

`warmup_period() == period`. The series is seeded with the close of
the first candle that completes the volume window.

## Degenerate zero-volume window

If every bar in the window has zero volume, `V_sum = 0` and the
recurrence is undefined (division by zero). EVWMA seeds to the
first such close and holds that value until non-zero volume arrives.

## Constant series guarantee

For a flat close (`close_t = c` every bar), `((V_sum − v) · c + v · c)
/ V_sum = c`, so EVWMA reproduces the constant exactly from the first
emission onward — independent of the volume distribution.

## Reference

Christian P. Fries, "Elastic Volume Weighted Moving Average",
*Wilmott Magazine*, 2001. See also `finta`'s `evwma` for a Python
reference implementation.
