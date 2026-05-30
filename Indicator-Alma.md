# ALMA

> Arnaud Legoux Moving Average — a Gaussian-weighted moving average
> over the last `period` closes, with the kernel centred at
> `offset · (period − 1)` and width controlled by `sigma`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Moving Averages |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded; tracks the input price scale |
| Default parameters | `(period = 9, offset = 0.85, sigma = 6.0)` |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | Smoother than `Sma`, more responsive than `Ema` once `offset` is tilted toward 1.0. |

## Formula

```
m = offset · (period − 1)
s = period / sigma
w[i] = exp(−(i − m)² / (2 · s²))   for i in 0..period
ALMA = Σ price[i] · w[i] / Σ w[i]
```

`offset = 0.85` puts the kernel peak near the newest sample (responsive);
`offset = 0.5` centres the kernel in the middle of the window (smooth).
Larger `sigma` produces a narrower kernel (sharper weighting);
smaller `sigma` broadens it toward an `Sma`.

Wickra pre-computes the normalised weights at construction, so each
`update()` is a single rolling-window dot product.

## Parameters

| Name     | Type    | Default | Valid range  | Description |
|----------|---------|---------|--------------|-------------|
| `period` | `usize` | `9`     | `>= 1`       | Window length. `0` errors with `Error::PeriodZero`. |
| `offset` | `f64`   | `0.85`  | `[0.0, 1.0]` | Kernel centre. Outside the range errors with `Error::InvalidPeriod`. |
| `sigma`  | `f64`   | `6.0`   | `> 0`        | Kernel width. Non-positive errors with `Error::InvalidPeriod`. |

`Alma::classic()` returns `Alma::new(9, 0.85, 6.0)`.

## Inputs / Outputs

```rust
impl Indicator for Alma {
    type Input = f64;
    type Output = f64;
}
```

Python `wickra.ALMA(period=9, offset=0.85, sigma=6.0)` returns
`float | None` / `numpy.ndarray` (NaN during warmup).
Node `new wickra.ALMA(period, offset, sigma)` returns
`number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period() == period`. The first non-`None` output lands on
input `period` (1-indexed) — there is no internal seeding stage,
the window must simply fill.

## Constant series guarantee

The weights are normalised to sum to 1 at construction, so any constant
input series is reproduced exactly from the first emission onward.

## Reference

Arnaud Legoux and Dimitrios Kouzis-Loukas, *ALMA — Arnaud Legoux Moving
Average*, 2009. The community-standard parameters (period 9, offset 0.85,
sigma 6) match the canonical `pandas-ta` defaults.
