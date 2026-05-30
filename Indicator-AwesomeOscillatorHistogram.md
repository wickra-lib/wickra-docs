# AwesomeOscillatorHistogram

> The difference between the `AwesomeOscillator` and its `sma_period`-bar
> `SMA`. A configurable generalisation of `AcceleratorOscillator`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `Candle` (uses `high` and `low` for the median price) |
| Output type | `f64` |
| Output range | unbounded around zero |
| Default parameters | `(fast = 5, slow = 34, sma_period = 5)` |
| Warmup period (`warmup_period()`) | `slow + sma_period − 1` |
| Interpretation | Positive bars: `AO` is rising (bullish acceleration). Negative bars: `AO` is falling. |

## Formula

```
AO         = SMA(median, fast) − SMA(median, slow)        where median = (high + low) / 2
AOHist     = AO − SMA(AO, sma_period)
```

With Williams' default `(5, 34, 5)` this matches the existing
`AcceleratorOscillator` exactly. For any other parameterisation
`AwesomeOscillatorHistogram` is the more flexible variant.

## Parameters

| Name         | Type    | Default | Valid range      | Description |
|--------------|---------|---------|------------------|-------------|
| `fast`       | `usize` | `5`     | `>= 1`, `< slow` | Fast SMA period inside AO. |
| `slow`       | `usize` | `34`    | `>= 1`, `> fast` | Slow SMA period inside AO. |
| `sma_period` | `usize` | `5`     | `>= 1`           | SMA period of the AO series. |
