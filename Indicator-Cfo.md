# CFO

> Chande Forecast Oscillator — percentage difference between the close
> and a linear-regression forecast of the close.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Price Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | unbounded around zero (in percent) |
| Default parameters | `period = 14` |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | Positive: close above the linear forecast (overshoot). Negative: below. |

## Formula

```
CFO_t = 100 · (close_t − LinearRegression(close, period)_t) / close_t
```

For a constant or perfectly linear input series `LinearRegression`
fits exactly and `CFO` is `0`. If the close is zero the percentage
form is undefined; Wickra holds the previous value rather than emit
infinity.

## Parameters

| Name     | Type    | Default | Valid range | Description |
|----------|---------|---------|-------------|-------------|
| `period` | `usize` | `14`    | `>= 1`      | Linear-regression window length. |

## Reference

Tushar Chande and Stanley Kroll, *The New Technical Trader*, 1994.
