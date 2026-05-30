# DoubleBollinger

> Two concentric Bollinger envelopes (Kathy Lien). The narrow `±k_inner·σ`
> band partitions price into buy / neutral / sell zones; the wide
> `±k_outer·σ` band marks extended moves to fade or trail.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `f64` (typically the close price) |
| Output type | `DoubleBollingerOutput { upper_outer, upper_inner, middle, lower_inner, lower_outer }` |
| Output range | unbounded; `lower_outer ≤ lower_inner ≤ middle ≤ upper_inner ≤ upper_outer` |
| Default parameters | `period = 20`, `k_inner = 1.0`, `k_outer = 2.0` |
| Warmup period | `period` |
| Interpretation | Three-zone setup: close above `upper_inner` = buy, between inner bands = neutral, below `lower_inner` = sell. Outer band marks exhaustion. |

## Formula

```
middle      = SMA(period)
sigma       = population stddev over the window
upper_outer = middle + k_outer · sigma          // wide channel (often 2σ)
upper_inner = middle + k_inner · sigma          // narrow channel (often 1σ)
lower_inner = middle − k_inner · sigma
lower_outer = middle − k_outer · sigma
```

`k_outer > k_inner` is enforced by the constructor so the outer band
strictly encloses the inner band and the five outputs remain
monotonically ordered.

## Parameters

| Name      | Type    | Default | Valid range | Description |
|-----------|---------|---------|-------------|-------------|
| `period`  | `usize` | `20`    | `>= 1`      | SMA + sigma window. |
| `k_inner` | `f64`   | `1.0`   | finite, `> 0`, `< k_outer` | Inner band sigma multiplier. |
| `k_outer` | `f64`   | `2.0`   | finite, `> k_inner` | Outer band sigma multiplier. |

`DoubleBollinger::classic()` returns `(20, 1.0, 2.0)`.

## Reference

- Kathy Lien, *Double Bollinger Bands Strategy: How to Trade Forex Like
  a Pro*, BabyPips article series (also covered in Lien's *Day Trading
  and Swing Trading the Currency Market*, 3rd ed., Wiley, 2015).

## See also

- [BollingerBands](Indicator-BollingerBands) — single-envelope sibling.
- [BollingerBandwidth](Indicator-BollingerBandwidth) — squeeze detection.
- [PercentB](Indicator-PercentB) — normalised position within a single
  Bollinger envelope.
