# IMI

> Intraday Momentum Index — Tushar Chande's RSI built from the candle body
> (open→close) instead of the close-to-close change.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Momentum Oscillators |
| Input type | `Candle` (uses open and close) |
| Output type | `f64` |
| Output range | `[0, 100]`; neutral `50` when bodies net to zero |
| Default parameters | `period` is required (no default in either binding) |
| Warmup period (`warmup_period()`) | `period` |
| Interpretation | Body-based overbought/oversold (intraday strength). |

## Formula

```
gain = max(close - open, 0),  loss = max(open - close, 0)
IMI  = 100 * Σ gain / (Σ gain + Σ loss)        over the last `period` bars
```

The IMI treats each white body (`close > open`) as an up-move and each black
body (`close < open`) as a down-move, then forms the RSI-style ratio over a
rolling window. Because it ignores the gap between bars and looks only at the
*body*, it gauges intraday buying vs. selling pressure — a candle-aware
overbought/oversold measure. Bounded in `[0, 100]`; a window of doji-like bars
(no net bodies) returns the neutral `50`.

Source: `crates/wickra-core/src/indicators/intraday_momentum_index.rs`.

## Parameters

| Name     | Type    | Default | Valid range | Source | Description |
|----------|---------|---------|-------------|--------|-------------|
| `period` | `usize` | none    | `>= 1`      | `intraday_momentum_index.rs:50` | Number of bars summed. `0` errors with `Error::PeriodZero`. |

(Python class `wickra.IMI(period)`; pass `period` explicitly.)

## Inputs / Outputs

From `crates/wickra-core/src/indicators/intraday_momentum_index.rs`:

```rust
use wickra::{Candle, IntradayMomentumIndex, Indicator};
// IntradayMomentumIndex: Input = Candle, Output = f64
const _: fn(&mut IntradayMomentumIndex, Candle) -> Option<f64> =
    <IntradayMomentumIndex as Indicator>::update;
```

Because the IMI needs the **open** (not just high/low/close), the bindings take
the full OHLC. Node: `update(open, high, low, close)` / `batch(o[], h[], l[], c[])`.
Python: `update(candle)` / `batch(open, high, low, close)` → 1-D `ndarray`
(`NaN` for warmup). Node returns `number | null` / `Array<number>` with `NaN`.

## Warmup

`warmup_period()` returns `period`: the window must hold `period` bars before the
ratio is defined, so the first non-`None` output lands on bar `period` (index
`period − 1`). Pinned by `accessors_and_metadata` (`warmup_period() == 14`) and
`all_up_bodies_is_one_hundred` (first two bars of a period-3 instance return
`None`, the third emits).

## Edge cases

- **All up bodies → 100 / all down → 0.** Pinned by `all_up_bodies_is_one_hundred`
  and `all_down_bodies_is_zero`.
- **Known mixed value.** `known_value_mixed_bodies` pins bodies `+1, −1, +2`
  (gain 3, loss 1) → `75`.
- **Doji window → 50.** `doji_window_is_neutral` (every `close == open`).
- **Window slides.** `slides_window` checks the rolling sum tracks correctly.
- **Reset.** `reset_clears_state`. **Streaming/batch:** `batch_equals_streaming`.

## Examples

### Rust

```rust
use wickra::{BatchExt, Candle, IntradayMomentumIndex, Indicator};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut imi = IntradayMomentumIndex::new(3)?;
    // bodies: +1, -1, +2  ->  gain 3, loss 1  ->  100 * 3/4 = 75
    let bars = [
        Candle::new(10.0, 12.0, 9.0, 11.0, 1.0, 0)?,   // +1
        Candle::new(11.0, 12.0, 9.0, 10.0, 1.0, 1)?,   // -1
        Candle::new(10.0, 13.0, 9.0, 12.0, 1.0, 2)?,   // +2
    ];
    let out: Vec<Option<f64>> = imi.batch(&bars);
    println!("warmup_period = {}", imi.warmup_period());
    println!("{:?}", out);
    Ok(())
}
```

Output:

```
warmup_period = 3
[None, None, Some(75.0)]
```

### Python

```python
import numpy as np
import wickra as ta

imi = ta.IMI(3)
op = np.array([10.0, 11.0, 10.0])
hi = np.array([12.0, 12.0, 13.0])
lo = np.array([9.0, 9.0, 9.0])
cl = np.array([11.0, 10.0, 12.0])
out = imi.batch(op, hi, lo, cl)
print("warmup_period =", imi.warmup_period())
print(out)
```

Output:

```
warmup_period = 3
[nan nan 75.]
```

### Node

```javascript
const ta = require('wickra');
const imi = new ta.IMI(3);
const open = [10, 11, 10];
const high = [12, 12, 13];
const low = [9, 9, 9];
const close = [11, 10, 12];
console.log(imi.batch(open, high, low, close));
console.log('warmupPeriod:', imi.warmupPeriod());
```

Output:

```
[ NaN, NaN, 75 ]
warmupPeriod: 3
```

### Streaming

```rust
use wickra::{Candle, IntradayMomentumIndex, Indicator};

let mut imi = IntradayMomentumIndex::new(14)?;
let mut last = None;
for i in 0..40 {
    let base = 100.0 + f64::from(i);
    let c = Candle::new(base, base + 1.0, base - 1.0, base + 0.5, 1.0, i64::from(i))?;
    last = imi.update(c);
}
println!("{last:?}");
# Ok::<(), Box<dyn std::error::Error>>(())
```

## Interpretation

The IMI is a candle-aware momentum oscillator: it answers "are buyers winning
the session?" by looking at where price *closes relative to its open*, not where
it closes relative to yesterday. That makes it especially useful for instruments
with large overnight gaps (where close-to-close RSI can be misled by the gap)
and for confirming candlestick-pattern reads.

Typical uses:

1. **Overbought/oversold.** Chande's classic 70/30 bands; readings above 70 flag
   strong intraday buying, below 30 strong selling.
2. **Gap filtering.** On gappy markets, IMI reflects real session strength where
   a close-to-close RSI would not.
3. **Candle confirmation.** A bullish reversal pattern carries more weight when
   IMI is turning up out of oversold.

## Common pitfalls

- **Using it on gapless/synthetic series.** With no open/close separation (e.g.
  line data) every body is zero and the IMI pins at 50; it needs real OHLC bars.
- **Confusing it with the RSI.** Same ratio shape, different input (body vs.
  close-to-close) — the two diverge most around gaps.

## References

Tushar Chande & Stanley Kroll, *The New Technical Trader*, 1994 — the Intraday
Momentum Index.

## See also

- [Indicator-Rsi](Indicator-Rsi) — the close-to-close analogue.
- [Indicator-BalanceOfPower](Indicator-BalanceOfPower) — another open/close pressure gauge.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
