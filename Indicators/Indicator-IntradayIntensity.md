# Intraday Intensity (Bostian)

> David Bostian's per-bar, volume-weighted close-location measure: the volume
> pushed toward a bar's extremes, `+volume` when the bar closes on its high,
> `−volume` on its low, `0` at the midpoint. Raw and **non-cumulative** — one
> value per bar, depending only on that bar.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Volume |
| Input type | `Candle` (uses `high`, `low`, `close`, `volume`) |
| Output type | `f64` — signed volume |
| Output range | `[−volume, +volume]` per bar (`0` for a zero-range bar) |
| Default parameters | none — `IntradayIntensity::new()` |
| Warmup period | `1` |
| Interpretation | Per-bar accumulation (`+`) / distribution (`−`) pressure |

## Formula

```text
II_t = volume_t * (2*close_t − high_t − low_t) / (high_t − low_t)     (0 if high == low)
```

The fraction `(2*close − high − low) / (high − low)` is the **close location**
inside the bar: `+1` when the close is on the high, `−1` on the low, `0` at the
midpoint. Multiplying by `volume` gives the volume committed toward the extremes
on that single bar — Bostian's per-bar proxy for accumulation (positive) or
distribution (negative). A doji whose `high == low` has no range and contributes
exactly `0`.

This emits the **raw per-bar** intensity. The **cumulative** running total is the
Accumulation/Distribution Line ([`Adl`](/Indicators/Indicator-Adl)); the
volume-normalized windowed form ("Intraday Intensity %") is mathematically the
Chaikin Money Flow ([`ChaikinMoneyFlow`](/Indicators/Indicator-ChaikinMoneyFlow)),
so neither is duplicated here.

See `crates/wickra-core/src/indicators/intraday_intensity.rs` (the update is at
`intraday_intensity.rs:63`).

## Parameters

| Name | Type | Default | Valid range | Source | Description |
|------|------|---------|-------------|--------|-------------|
| *(none)* | — | — | — | `intraday_intensity.rs:49` | `IntradayIntensity::new()` is parameter-free and infallible. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/intraday_intensity.rs`:

```rust
use wickra::{Candle, IntradayIntensity, Indicator};
// IntradayIntensity: Input = Candle, Output = f64
const _: fn(&mut IntradayIntensity, Candle) -> Option<f64> =
    <IntradayIntensity as Indicator>::update;
```

Python streams as `float | None` and batches
`IntradayIntensity().batch(high, low, close, volume)` to a 1-D `numpy.ndarray`.
Node streams as `number | null` via `update(high, low, close, volume)` and
batches `batch(high, low, close, volume)`. With `warmup_period == 1` there is no
`NaN`/`null` warmup prefix.

## Warmup

`IntradayIntensity::new().warmup_period() == 1`. Every bar produces a value — the
first bar already emits, since the measure depends only on the current bar. The
unit tests `accessors_and_metadata` (`warmup_period() == 1`) and `first_bar_emits`
pin this.

## Edge cases

- **Close on the high.** `II = +volume`. Unit test `close_on_high_adds_full_volume`
  (high `110`, low `100`, close `110`, volume `1000` → `1000`).
- **Close on the low.** `II = −volume`. Unit test `close_on_low_subtracts_full_volume`
  (same bar closing at `100` → `−1000`).
- **Close at the midpoint.** `II = 0`. Unit test `close_at_midpoint_adds_nothing`
  (close `105` → `0`).
- **Zero range (`high == low`).** Guarded to `0`, no division by zero. Unit test
  `zero_range_adds_nothing`.
- **Per-bar independence.** Output depends only on the current bar; a
  close-on-high bar is not carried into the next. Unit test `each_bar_is_independent`.
- **Reset.** `reset()` clears the last value. Unit test `reset_clears_state`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, IntradayIntensity, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Same bar (high 110, low 100, volume 1000) closing on the high, the
    // midpoint, and the low.
    let candles = [
        Candle::new(100.0, 110.0, 100.0, 110.0, 1000.0, 0)?, // close on high
        Candle::new(100.0, 110.0, 100.0, 105.0, 1000.0, 1)?, // close at midpoint
        Candle::new(100.0, 110.0, 100.0, 100.0, 1000.0, 2)?, // close on low
    ];
    let out = IntradayIntensity::new().batch(&candles);
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
[Some(1000.0), Some(0.0), Some(-1000.0)]
```

`(2·110 − 110 − 100)/(110 − 100) = +1`, `·1000 = 1000`; the midpoint close gives
`0`; the close on the low gives `−1000`. These match the
`close_on_high_adds_full_volume`, `close_at_midpoint_adds_nothing` and
`close_on_low_subtracts_full_volume` unit tests — and the per-bar values do **not**
accumulate (`each_bar_is_independent`).

### Python

```python
import wickra as ta

high = [110.0, 110.0, 110.0]
low = [100.0, 100.0, 100.0]
close = [110.0, 105.0, 100.0]
volume = [1000.0, 1000.0, 1000.0]
ii = ta.IntradayIntensity()
print(ii.batch(high, low, close, volume))
```

Output:

```
[ 1000.     0. -1000.]
```

### Node

```javascript
const wickra = require('wickra');

const ii = new wickra.IntradayIntensity();
console.log(
  ii.batch([110, 110, 110], [100, 100, 100], [110, 105, 100], [1000, 1000, 1000]),
);
```

Output:

```
[ 1000, 0, -1000 ]
```

### Streaming

```rust
use wickra::{Candle, IntradayIntensity, Indicator};

let mut ii = IntradayIntensity::new();
let feed: Vec<Candle> = Vec::new(); // your live OHLCV candle feed
for bar in feed {
    if let Some(v) = ii.update(bar) {
        // v > 0: the bar closed in its upper half on real volume (accumulation)
        // v < 0: lower half (distribution). Sum it yourself for the A/D line.
        let _ = v;
    }
}
```

## Interpretation

1. **Per-bar pressure.** Each value is one bar's accumulation/distribution
   pressure — large positive on a high-volume close-on-high, large negative on a
   high-volume close-on-low.
2. **Build your own derived forms.** The running sum of this series is the
   Accumulation/Distribution Line ([`Adl`](/Indicators/Indicator-Adl)); the
   volume-normalized windowed average ("Intraday Intensity %") is mathematically
   the Chaikin Money Flow ([`ChaikinMoneyFlow`](/Indicators/Indicator-ChaikinMoneyFlow)).
   This indicator gives you the raw per-bar term those are built from.
3. **Volume quality matters.** Because the term scales with `volume`, noisy or
   missing volume data dominates the output.

## Common pitfalls

- **Expecting a cumulative line.** This is the **raw per-bar** term, not a running
  total. For the cumulative line use [`Adl`](/Indicators/Indicator-Adl).
- **Comparing levels across instruments.** The output scales with absolute
  volume, so levels are not comparable across symbols without normalization
  (which is what `ChaikinMoneyFlow` does).
- **Zero on a flat bar.** A `high == low` bar contributes `0` by construction —
  not a missing value.

## References

- David Bostian, *Intraday Intensity Index* — the per-bar volume-weighted
  close-location measure popularized in John Bollinger's *Bollinger on Bollinger
  Bands* (2001).

## See also

- [Adl](/Indicators/Indicator-Adl) — the cumulative running total of this term.
- [ChaikinMoneyFlow](/Indicators/Indicator-ChaikinMoneyFlow) — its volume-normalized windowed form.
- [AdOscillator](/Indicators/Indicator-AdOscillator) — a related volume-less flow oscillator.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
