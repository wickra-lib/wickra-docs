# Alligator

> Bill Williams' Alligator — three `Smma` lines (Jaw / Teeth / Lips) of
> the median price `(high + low) / 2` with different smoothing periods.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `Candle` (uses `high` and `low`) |
| Output type | `AlligatorOutput { jaw, teeth, lips }` — multi-output |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `(jaw = 13, teeth = 8, lips = 5)` |
| Warmup period (`warmup_period()`) | `max(jaw, teeth, lips)` = `13` for classic |
| Interpretation | Three SMMA lines whose interleaving signals the "Alligator" state (sleeping, awakening, eating). |

## Formula

```
median_t = (high_t + low_t) / 2

Jaw_t   = SMMA(median, jaw_period)_t
Teeth_t = SMMA(median, teeth_period)_t
Lips_t  = SMMA(median, lips_period)_t
```

`Smma` is Wilder's smoothed moving average (also known as RMA),
SMA-seeded with a `1 / period` smoothing factor.

## Visual shift (not applied by Wickra)

In Williams' original chart presentation each line is additionally
*shifted forward* by a fixed number of bars (Jaw +8, Teeth +5, Lips +3).
Wickra publishes the **unshifted** SMMA values — the shift is a chart
convention and is left to the consumer to apply on the display side.

## Parameters

| Name           | Type    | Default | Valid range | Description |
|----------------|---------|---------|-------------|-------------|
| `jaw_period`   | `usize` | `13`    | `>= 1` | Slowest line. |
| `teeth_period` | `usize` | `8`     | `>= 1` | Middle line. |
| `lips_period`  | `usize` | `5`     | `>= 1` | Fastest line. |

Any zero period errors with `Error::PeriodZero`.
`Alligator::classic()` returns `Alligator::new(13, 8, 5)`.

## Inputs / Outputs

```rust
impl Indicator for Alligator {
    type Input = Candle;
    type Output = AlligatorOutput;
}
```

Python `wickra.Alligator(jaw, teeth, lips)`: `update(candle)` returns
`(jaw, teeth, lips) | None`; `batch(high, low)` returns an
`(n, 3)` `numpy.ndarray` (NaN during warmup).

Node `new wickra.Alligator(jaw, teeth, lips)`: `update(high, low)`
returns `{ jaw, teeth, lips } | null`; `batch(high, low)` returns a
flat `Array<number>` of length `3n`, ordered as
`[jaw₀, teeth₀, lips₀, jaw₁, …]`.

## Warmup

All three SMMAs see every bar, so readiness is gated by the longest
period (the Jaw): `warmup_period() == max(jaw, teeth, lips)`.

## Constant median guarantee

If every candle's median is the same constant `c`, all three SMMAs seed
to `c` and the recurrence holds — Jaw, Teeth, and Lips all stay at `c`.

## Reference

Bill Williams, *Trading Chaos*, 1995. See also `pandas-ta`'s `alligator`
for a Python reference implementation.
