# TtmSqueeze

> John Carter's volatility squeeze: Bollinger Bands sitting *inside* a
> Keltner Channel signals a coiled market about to expand. Paired with a
> detrended-close momentum line that gives the breakout direction.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`, `close`) |
| Output type | `TtmSqueezeOutput { squeeze, momentum }` |
| Output range | `squeeze ∈ {0.0, 1.0}`; `momentum` unbounded |
| Default parameters | `period = 20`, `bb_mult = 2.0`, `kc_mult = 1.5` |
| Warmup period | `period` |
| Interpretation | Squeeze releases (`squeeze` flips from `1.0` to `0.0`) signal a breakout; trade in the direction of `sign(momentum)`. |

## Formula

```
squeeze  = 1.0 if BollingerBands(period, bb_mult)
               ⊂ KeltnerChannels-like(SMA(period), ATR(period), kc_mult)
           else 0.0

hl_mid   = (max(high, period) + min(low, period)) / 2
detrend  = close − (hl_mid + SMA(close, period)) / 2
momentum = LinearRegression(detrend, period)        // endpoint
```

The "Keltner-like" envelope here uses an *SMA* centerline (not the EMA
of typical price that [Keltner](Indicator-Keltner) uses) plus an ATR
offset, exactly as Carter's original publication and every chart-vendor
implementation define it.

`momentum` is a histogram-like reading: positive in a breakout up,
negative in a breakout down. Carter's trade rule is:

1. Wait for `squeeze` to be `1.0` for at least a few bars (the coil).
2. Enter when `squeeze` flips back to `0.0` (the release).
3. Trade in the direction of the `momentum` sign at the release bar.
4. Hold while `momentum` continues to expand in your direction.

## Parameters

| Name      | Type    | Default | Valid range | Description |
|-----------|---------|---------|-------------|-------------|
| `period`  | `usize` | `20`    | `>= 2`      | Shared SMA, BB, ATR and regression window. |
| `bb_mult` | `f64`   | `2.0`   | finite, `> 0` | Bollinger Bands multiplier. |
| `kc_mult` | `f64`   | `1.5`   | finite, `> 0` | Keltner-like ATR multiplier. |

`TtmSqueeze::classic()` returns `(20, 2.0, 1.5)`.

## Reference

- John Carter, *Mastering the Trade*, McGraw-Hill, 2005. The original
  "TTM Squeeze" was distributed as a proprietary TradeStation indicator
  through Carter's Trade The Markets / Simpler Trading service.

## See also

- [BollingerBands](Indicator-BollingerBands) — one of the two envelopes.
- [Keltner](Indicator-Keltner) — the other envelope (note Carter's
  Keltner-like definition uses an SMA centerline, not Keltner's EMA).
- [BollingerBandwidth](Indicator-BollingerBandwidth) — a continuous
  measure of "how squeezed" the bands are.
