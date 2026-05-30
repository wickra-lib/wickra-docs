# Inertia

> Donald Dorsey's Inertia — a `LinearRegression` smoothing of the
> [`RVI`](Indicator-Rvi) series. Preserves trend direction while damping
> the underlying ratio.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (uses `open`, `high`, `low`, `close`) |
| Output type | `f64` |
| Output range | unbounded; tracks the `RVI` ratio's scale |
| Default parameters | `(rvi_period = 14, linreg_period = 20)` |
| Warmup period (`warmup_period()`) | `rvi_period + linreg_period − 1` |
| Interpretation | Slow trend-following variant of `RVI`; cross of zero signals trend change. |

## Formula

```
Inertia_t = LinearRegression(RVI(close − open, high − low; rvi_period), linreg_period)_t
```

The `RVI` value at each bar feeds the rolling least-squares
regression; the endpoint of the fit is published.

## Parameters

| Name            | Type    | Default | Valid range | Description |
|-----------------|---------|---------|-------------|-------------|
| `rvi_period`    | `usize` | `14`    | `>= 1`      | `RVI` window. |
| `linreg_period` | `usize` | `20`    | `>= 1`      | `LinearRegression` window over the `RVI` series. |

Any zero period errors with `Error::PeriodZero`.

## Warmup

```
warmup_period = rvi_period + linreg_period − 1
```

`RVI` emits at `rvi_period` candles; the `LinearRegression` then needs
`linreg_period − 1` more `RVI` values to fill its window.

## Reference

Donald Dorsey, "Inertia", *Stocks & Commodities*, also `pandas-ta`'s
`inertia`.
