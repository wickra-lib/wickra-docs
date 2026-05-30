# KST

> Martin Pring's Know Sure Thing — a long-horizon momentum oscillator
> combining four `SMA`-smoothed `ROC` series with Pring's fixed
> weights `1, 2, 3, 4`, plus an `SMA` signal line.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single close) |
| Output type | `KstOutput { kst, signal }` — multi-output |
| Output range | unbounded |
| Default parameters | Pring's classic — see below |
| Warmup period (`warmup_period()`) | longest `roc_i + sma_i` branch + `signal − 1` |
| Interpretation | Cross of the `kst` line above its `signal` is bullish; below is bearish. |

## Formula

```
RCMA_i = SMA(ROC(close, roc_i), sma_i)        for i = 1..=4
KST    = 1·RCMA_1 + 2·RCMA_2 + 3·RCMA_3 + 4·RCMA_4
Signal = SMA(KST, signal_period)
```

`Kst::classic()` applies Pring's recommended defaults:
`(roc1, roc2, roc3, roc4) = (10, 15, 20, 30)`,
`(sma1, sma2, sma3, sma4) = (10, 10, 10, 15)`,
`signal_period = 9`.

## Parameters

Nine parameters, all `usize`, all required to be non-zero (Wickra
rejects zero with `Error::PeriodZero`):

| Name              | Default | Description |
|-------------------|---------|-------------|
| `roc1` … `roc4`   | 10, 15, 20, 30 | Lookback for the four `ROC` series. |
| `sma1` … `sma4`   | 10, 10, 10, 15 | Smoothing length for each `RCMA_i`. |
| `signal_period`   | 9       | Smoothing length for the signal line. |

## Inputs / Outputs

Python `wickra.KST(...)`: `update(value)` returns `(kst, signal) | None`;
`batch(prices)` returns an `(n, 2)` `numpy.ndarray`.

Node `new wickra.KST(...)`: `update(value)` returns
`{ kst, signal } | null`; `batch(prices)` returns a flat
`Array<number>` of length `2n`.

WASM `new KST(...)`: same as Node, returns `{ kst, signal }`.

## Warmup

```
slowest_branch = max(roc_i + sma_i over i = 1..=4)
warmup_period  = slowest_branch + signal_period − 1
```

For Pring's defaults the slowest branch is `ROC(30) + SMA(15) = 45`
and the signal adds 8, so the indicator emits at input 53.

## Reference

Martin J. Pring, "Summed Rate of Change (KST)", *Stocks & Commodities*,
1992. See also `pandas-ta`'s `kst`.
