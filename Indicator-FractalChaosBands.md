# FractalChaosBands

> A step-function envelope of the most recent Bill Williams fractal
> highs and lows. The bands ratchet outwards as new fractals form and
> otherwise stay flat — a swing-level reference rather than a
> volatility envelope.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Bands & Channels |
| Input type | `Candle` (uses `high`, `low`) |
| Output type | `FractalChaosBandsOutput { upper, lower }` |
| Output range | unbounded; `upper ≥ lower` |
| Default parameters | `k = 2` (5-bar fractals) |
| Warmup period | `2k + 1`, plus enough bars for at least one fractal of each kind |
| Interpretation | Most recent confirmed swing high / swing low. Breakouts often used as Williams-style entries. |

## Formula

A bar at index `i` is a **fractal high** when its high is the strict
maximum of the window `[i − k, …, i + k]`. A **fractal low** is
defined symmetrically on lows.

```
confirmation_lag = k                     // the centre bar is known only k bars later
upper = high of the most recent confirmed fractal high
lower = low  of the most recent confirmed fractal low
```

With `k` bars of look-ahead, every band update reflects price `k` bars
ago — strict streaming preserves this lag rather than peeking into the
future. `k = 2` (5-bar fractals) is the canonical Williams setting and
matches the "Fractal Chaos Bands" indicator shipped with several chart
vendors.

## Parameters

| Name | Type    | Default | Valid range | Description |
|------|---------|---------|-------------|-------------|
| `k`  | `usize` | `2`     | `>= 1`      | Fractal half-width (window length is `2k + 1`). |

`FractalChaosBands::classic()` returns `(2)`.

## Edge cases

- **Flat market.** No bar is strictly higher (or lower) than its
  neighbours, so no fractal ever confirms and the indicator never
  emits.
- **Both bands required.** `update` returns `None` until at least one
  fractal high *and* one fractal low have been seen — neither band can
  be reported in isolation under the Wickra contract.

## Reference

- Bill Williams, *Trading Chaos: Maximize Profits with Proven
  Technical Techniques*, Wiley, 1995. Williams' fractal definition
  forms the basis of his Alligator + Awesome Oscillator system; the
  "Fractal Chaos Bands" naming convention comes from later chart-vendor
  implementations.

## See also

- [Donchian](Indicator-Donchian) — every-bar rolling high/low (no
  fractal confirmation).
- [Alligator](Indicator-Alligator) — Williams' own moving-average
  triplet, often paired with fractals.
- [AwesomeOscillator](Indicator-AwesomeOscillator) — Williams'
  momentum reading.
