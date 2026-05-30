# McGinleyDynamic

> John McGinley's self-adjusting moving average — speeds up when price
> falls below the indicator and damps when price runs above.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `period` (no default; `10` in Python) |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | Adaptive MA that compensates for price-vs-MA acceleration. |

## Formula

```
seed = SMA(price, period)                        // first `period` inputs
ratio   = price_t / MD_{t-1}
divisor = 0.6 · period · ratio⁴
MD_t    = MD_{t-1} + (price_t − MD_{t-1}) / divisor
```

The fourth-power ratio shrinks the divisor when price falls below the
indicator (so the indicator catches up faster) and inflates it when
price runs above the indicator (more smoothing). `0.6` is the original
constant `K` from McGinley's article.

## Parameters

| Name     | Type    | Default | Valid range | Description |
|----------|---------|---------|-------------|-------------|
| `period` | `usize` | `10` (Python) | `>= 1` | Smoothing length. `0` errors with `Error::PeriodZero`. |

## Defensive behaviour

If either `MD_{t-1}` or the incoming price is non-positive, the
recurrence is undefined (division by zero or negative `ratio⁴` is
ill-conditioned for a price-scale series). Wickra holds the previous
value and resumes the recurrence on the next positive price.

Non-finite inputs (`NaN`, `±∞`) are ignored: the state is left
untouched and `update()` returns the last value.

## Warmup

`warmup_period() == period`. The indicator is seeded with
`SMA(period)` of the first `period` inputs.

## Constant series guarantee

For a flat input stream, `ratio = 1` and `(price − MD) = 0`, so the
recurrence collapses to `MD + 0 = MD` — the constant is reproduced
exactly.

## Reference

John R. McGinley Jr., "McGinley Dynamic", *Technical Analysis of
Stocks & Commodities*, 1990. The widely-used `0.6` constant matches
McGinley's original paper and the TradingView implementation;
`pandas-ta`'s `mcgd(c=1.0)` variant is a later, looser tuning.
