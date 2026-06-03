# MacdFix

> MACD Fix (`MACDFIX`) — the classic MACD with the fast and slow EMAs fixed at
> 12 and 26, leaving only the signal period configurable.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `f64` (single close) |
| Output type | `MacdOutput { macd, signal, histogram }` |
| Output range | unbounded; `histogram = macd − signal` |
| Default parameters | `signal` is required (fast/slow fixed at 12/26) |
| Warmup period | same as `MacdIndicator::new(12, 26, signal)` |
| Interpretation | The standard 12/26 MACD; only the signal smoothing is tunable. |

## Formula

```
macd      = EMA(close, 12) − EMA(close, 26)
signal    = EMA(macd, signal_period)
histogram = macd − signal
```

`MacdFix` is exactly [`MacdIndicator::new(12, 26, signal)`](Indicator-MacdIndicator),
packaged as a single-parameter constructor for the overwhelmingly common 12/26
case. The output is the usual `MacdOutput` triple. See
`crates/wickra-core/src/indicators/macd_fix.rs`.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `signal` | `usize` | none | `>= 1` | Signal-line EMA period (the classic value is `9`). `signal = 0` errors with `Error::PeriodZero`. | `macd_fix.rs:37` |

The fast (`12`) and slow (`26`) EMA periods are fixed and not configurable; use
[`MacdIndicator`](Indicator-MacdIndicator) if you need to change them.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/macd_fix.rs`:

```rust
use wickra::{Indicator, MacdFix};
use wickra::MacdOutput;
// MacdFix: Input = f64, Output = MacdOutput
const _: fn(&mut MacdFix, f64) -> Option<MacdOutput> = <MacdFix as Indicator>::update;
```

In Python `update` returns a `(macd, signal, histogram)` tuple (or `None` during
warmup) and `batch` returns an `(n, 3)` `numpy.ndarray`. In Node `update` returns
a `{ macd, signal, histogram }` object and `batch` a flat `Array<number>` of
length `n · 3`.

## Warmup

`MacdFix::new(signal).warmup_period()` equals
`MacdIndicator::new(12, 26, signal).warmup_period()` — the slow EMA must seed and
then the signal EMA must seed on top of it. The unit test
`accessors_report_config` pins this equality directly.

## Edge cases

- **Equivalence to `MacdIndicator`.** `MacdFix::new(s)` produces output identical
  to `MacdIndicator::new(12, 26, s)` on the same series. The unit test
  `matches_macd_with_fixed_periods` pins this.
- **Zero signal.** `MacdFix::new(0)` returns `Err(Error::PeriodZero)`. The unit
  test `rejects_zero_signal` pins this.
- **Constant series.** Once warmed, a flat price gives `macd = 0`, `signal = 0`,
  `histogram = 0` (both EMAs converge to the constant). See the example below.
- **Reset.** `m.reset()` clears all three EMA states. The unit test
  `reset_clears_state` pins this.

## Examples

### Rust

```rust
use wickra::{BatchExt, Indicator, MacdFix};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut m = MacdFix::new(9)?;
    let out = m.batch(&[100.0; 60]);
    println!("{:?}", out.last().unwrap());
    Ok(())
}
```

Output:

```
Some(MacdOutput { macd: 0.0, signal: 0.0, histogram: 0.0 })
```

On a constant series both the 12- and 26-period EMAs converge to `100`, so
`macd = 0`, the signal EMA of zero is `0`, and `histogram = 0`. On real data the
three lines diverge; the `histogram = macd − signal` identity always holds.

### Python

```python
import numpy as np
import wickra as ta

m = ta.MacdFix(9)
out = m.batch(np.full(60, 100.0))   # (60, 3) array
print(out[-1])   # last row: macd, signal, histogram
```

Output:

```
[0. 0. 0.]
```

### Node

```javascript
const ta = require('wickra');
const m = new ta.MacdFix(9);
let last = null;
for (let i = 0; i < 60; i++) last = m.update(100);
console.log(last);
```

Output:

```
{ macd: 0, signal: 0, histogram: 0 }
```

## Interpretation

`MacdFix` is the textbook MACD(12, 26, 9) momentum oscillator. Read it the
standard way: `macd` crossing its `signal` line is the primary trade trigger, the
`histogram` (their difference) shows momentum building or fading, and `macd`
crossing zero marks the fast/slow EMA crossover. Use `MacdFix` when you want the
canonical configuration without spelling out `12, 26`; use
[`MacdIndicator`](Indicator-MacdIndicator) when you need non-standard fast/slow lengths.

## Common pitfalls

- **Expecting to change fast/slow.** They are fixed at 12/26 by design; reach for
  [`MacdIndicator`](Indicator-MacdIndicator) to vary them.
- **Comparing histograms across instruments.** MACD is in price units, so its
  scale depends on the instrument; normalise (e.g. by ATR) before comparing.

## References

Gerald Appel's MACD (1979); the fixed-12/26 packaging matches TA-Lib's `MACDFIX`.

## See also

- [Indicator-MacdIndicator](Indicator-MacdIndicator) — the fully configurable MACD.
- [Indicator-MacdExt](Indicator-MacdExt) — MACD with selectable moving-average types.
- [Indicators-Overview](Indicators-Overview) — the full taxonomy.
