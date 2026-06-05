# Anchored RSI

> A cumulative Relative Strength Index whose averaging begins at a runtime-chosen
> anchor bar instead of over a fixed Wilder period.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `f64` (single close) |
| Output type | `f64` |
| Output range | `0.0 ..= 100.0` |
| Default parameters | none — re-anchor at runtime with `set_anchor()` |
| Warmup period | 2 (needs one price change) |
| Interpretation | RSI of the *entire move since the anchor*, not a rolling window. |

## Formula

For every bar since the current anchor:

```
gain_i = max(close_i - close_{i-1}, 0)
loss_i = max(close_{i-1} - close_i, 0)
RSI_t  = 100 - 100 / (1 + Σ gain_i / Σ loss_i)
```

The relative strength is the ratio of *cumulative* gains to *cumulative* losses
since the anchor; the per-bar count cancels, so this equals `avg_gain / avg_loss`
over the anchored window. Where [`Rsi`](/Indicators/Indicator-Rsi) applies Wilder's
`period`-length smoothing (`α = 1/period`), Anchored RSI gives **equal weight to
every move since the anchor** — so it answers "what is the RSI of the whole leg
that started at my anchor?". See
`crates/wickra-core/src/indicators/anchored_rsi.rs`.

Saturation follows the standard convention: a window with no losses yet (and at
least one gain) reads `100`, no gains yet reads `0`, and a perfectly flat window
reads the neutral `50` — identical to the convention used by [`Rsi`](/Indicators/Indicator-Rsi).

## Parameters

None. The averaging window is opened at construction (the first close is the
anchor) and re-opened at runtime:

| Method | Description |
|--------|-------------|
| `set_anchor()` | Marks a re-anchor; the **next** `update` clears the running sums and previous close before folding in its own bar, starting a fresh anchored window. Mirrors [`AnchoredVwap`](/Indicators/Indicator-AnchoredVwap)'s "click to anchor" workflow. |

## Inputs / Outputs

From `crates/wickra-core/src/indicators/anchored_rsi.rs`:

```rust
use wickra::{AnchoredRsi, Indicator};
// AnchoredRsi: Input = f64, Output = f64
const _: fn(&mut AnchoredRsi, f64) -> Option<f64> = <AnchoredRsi as Indicator>::update;
```

Python streams as `float | None`, batches a close column to a 1-D
`numpy.ndarray` (`NaN` for warmup). Node streams as `number | null`, batches as
`Array<number>` with `NaN` placeholders.

## Warmup

`AnchoredRsi::new().warmup_period() == 2`. The first close only seeds the
previous-close reference and returns `None`; the first value follows on the
second close (one price change is enough). After a `set_anchor()`, the first bar
of the new window likewise re-seeds and returns `None`. The unit test
`first_bar_seeds_and_returns_none` pins this contract.

## Edge cases

- **Pure uptrend → 100.** Monotonically rising closes have zero cumulative loss,
  so RSI saturates at `100`. The unit test `pure_uptrend_saturates_at_100` pins this.
- **Pure downtrend → 0.** Monotonically falling closes give zero cumulative gain
  → `0`. Pinned by `pure_downtrend_saturates_at_0`.
- **Flat window → 50.** No movement at all reads the neutral `50`. Pinned by
  `flat_window_reads_50`.
- **Re-anchor.** `set_anchor()` discards the old window; a downtrend that read `0`
  followed by a re-anchored uptrend reads a fresh `100`. Pinned by
  `set_anchor_clears_old_window`.
- **Non-finite inputs.** `NaN` / `±inf` are ignored: they do not advance the
  window and the last value is returned unchanged. Pinned by
  `ignores_non_finite_input` and `non_finite_before_any_bar_returns_none`.
- **Reset.** `reset()` clears the window and previous close; the next close
  re-seeds. Pinned by `reset_clears_state`.

## Examples

### Rust

```rust
use wickra::{AnchoredRsi, BatchExt, Indicator};

fn main() {
    // prices 10 -> 11 (+1) -> 9 (-2) -> 12 (+3)
    let mut rsi = AnchoredRsi::new();
    let out: Vec<Option<f64>> = rsi.batch(&[10.0, 11.0, 9.0, 12.0]);
    println!("{:?}", out);
}
```

Output:

```
[None, Some(100.0), Some(33.333333333333336), Some(66.66666666666667)]
```

After bar 2 the cumulative gain/loss is `1 / 2` → `100 − 100/1.5 = 33.33`; after
bar 3 it is `4 / 2` → `100 − 100/3 = 66.67`. This matches the
`cumulative_reference_values` unit test.

### Python

```python
import wickra as ta

rsi = ta.AnchoredRSI()
for x in [10.0, 11.0, 9.0, 12.0]:
    print(x, '->', rsi.update(x))
print('value:', rsi.value)
rsi.set_anchor()  # next update opens a fresh anchored window
```

Output:

```
10.0 -> None
11.0 -> 100.0
9.0 -> 33.333333333333336
12.0 -> 66.66666666666667
value: 66.66666666666667
```

### Node

```javascript
const ta = require('wickra');
const rsi = new ta.AnchoredRSI();
for (const x of [10, 11, 9, 12]) {
  console.log(x, '->', rsi.update(x));
}
rsi.setAnchor();
```

Output:

```
10 -> null
11 -> 100
9 -> 33.333333333333336
12 -> 66.66666666666667
```

### Streaming with a re-anchor

```python
import wickra as ta

rsi = ta.AnchoredRSI()
for x in [20.0, 19.0, 18.0, 17.0]:  # downtrend -> 0
    rsi.update(x)
assert rsi.value == 0.0
rsi.set_anchor()
assert rsi.update(50.0) is None     # re-seeds
assert rsi.update(51.0) == 100.0    # fresh up-leg
```

## Interpretation

Anchor the index at a structurally meaningful bar — a swing low, an earnings
gap, a session open — and Anchored RSI reports the momentum of the *whole leg*
since that point, with no period to tune. Because it is cumulative, it is
steadier than a rolling [`Rsi`](/Indicators/Indicator-Rsi) deep into a trend (one more bar
barely moves a long-running average), which makes divergence against the anchored
leg easy to read. Use the rolling [`Rsi`](/Indicators/Indicator-Rsi) when you want a
fixed-lookback oscillator; use Anchored RSI when the relevant question is "how
strong is *this* move from *this* point".

## Common pitfalls

- **Expecting Wilder values.** Anchored RSI is **not** `Rsi` with a reset — it
  uses simple cumulative averages, not Wilder's `α = 1/period` smoothing, and it
  has no period. Numbers will not match an `Rsi(14)` line.
- **Forgetting the re-seed after `set_anchor()`.** Because RSI needs a price
  change, the first bar after an anchor returns `None`; the first value of the
  new leg appears on the *second* bar, not the first (unlike
  [`AnchoredVwap`](/Indicators/Indicator-AnchoredVwap), which emits immediately).

## References

The Relative Strength Index is due to J. Welles Wilder Jr., *New Concepts in
Technical Trading Systems* (1978). The "anchored" variant applies the same
runtime-anchor idea popularised for VWAP by Brian Shannon to the RSI ratio.

## See also

- [Indicator-Rsi](/Indicators/Indicator-Rsi) — the fixed-period Wilder RSI.
- [Indicator-AnchoredVwap](/Indicators/Indicator-AnchoredVwap) — the volume-weighted anchored sibling.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
