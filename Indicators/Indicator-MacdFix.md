# MacdFix

> MACD Fix (`MACDFIX`) — the classic MACD with the fast and slow EMAs fixed at
> 12 and 26, leaving only the signal period configurable. Following TA-Lib, the
> two EMAs smooth with the fixed constants `0.15` / `0.075` rather than
> `2/13` / `2/27`.

## Quick reference

| Field | Value |
|-------|-------|
| Family | Trend & Directional |
| Input type | `f64` (single close) |
| Output type | `MacdOutput { macd, signal, histogram }` |
| Output range | unbounded; `histogram = macd − signal` |
| Default parameters | `signal` is required (fast/slow fixed at 12/26) |
| Warmup period | same as `MacdIndicator::new(12, 26, signal)` (`26 + signal − 1`, `34` for `signal = 9`) |
| Interpretation | TA-Lib's fixed-constant 12/26 MACD; only the signal smoothing is tunable. |

## Formula

```
fast      = EMA(close; seed SMA(12), α = 0.15)
slow      = EMA(close; seed SMA(26), α = 0.075)
macd      = fast − slow
signal    = EMA(macd, signal_period)          // ordinary α = 2 / (signal_period + 1)
histogram = macd − signal
```

This is TA-Lib's `MACDFIX`: the 12- and 26-bar EMAs use Gerald Appel's rounded
smoothing constants `0.15` and `0.075` instead of the period-derived `2/13 ≈ 0.1538`
and `2/27 ≈ 0.0741` (both still seeded with their simple means). `MacdFix` is
therefore **not** identical to
[`MacdIndicator::new(12, 26, signal)`](/Indicators/Indicator-MacdIndicator) — the
values differ slightly, though the warmup and output shape are the same. The
signal line is an ordinary `signal`-period EMA of the MACD line. The output is the
usual `MacdOutput` triple. See `crates/wickra-core/src/indicators/macd_fix.rs`.

**TA-Lib parity.** `MacdFix(9)` uses the same constants and emits its first row
on the same bar (33) as TA-Lib `MACDFIX(9)`, and is identical to it (to `1e-9`)
from bar 164 on in the TA-Lib reference suite. The early rows differ only by
the EMA seed: Wickra seeds each EMA with the SMA of its own first window (the
fast EMA from bars 0–11), while TA-Lib delays the fast EMA's seed so it ends on
the slow EMA's first bar; the gap decays by a factor `0.85` per bar.

## Parameters

| Name | Type | Default | Valid range | Description | Source |
|------|------|---------|-------------|-------------|--------|
| `signal` | `usize` | none | `>= 1` | Signal-line EMA period (the classic value is `9`). `signal = 0` errors with `Error::PeriodZero`. | `macd_fix.rs:45` |

The fast (`12`) and slow (`26`) EMA periods are fixed and not configurable; use
[`MacdIndicator`](/Indicators/Indicator-MacdIndicator) if you need to change them.

## Inputs / Outputs

From `crates/wickra-core/src/indicators/macd_fix.rs`:

```rust
use wickra::{Indicator, MacdFix};
use wickra::MacdOutput;
// MacdFix: Input = f64, Output = MacdOutput
const _: fn(&mut MacdFix, f64) -> Option<MacdOutput> = <MacdFix as Indicator>::update;
```

In Python `update` returns a `(macd, signal, histogram)` tuple (or `None` during
warmup) and `batch` returns an `(n, 3)` `Matrix`. In Node `update` returns
a `{ macd, signal, histogram }` object and `batch` a flat `Array<number>` of
length `n · 3`.

Beside the generic `batch`, `MacdFix` carries MACD's fused flat batches in Rust:
`batch_macd` / `batch_macd_into` (exact, `[macd, signal, histogram]` per row,
`NaN` warmup rows, bit-identical to streaming) and `batch_macd_fast` /
`batch_macd_fast_into` (the opt-in SIMD kernel, agreeing to within a few ULP).
The `_into` forms panic unless `out.len() == inputs.len() * 3`. Every binding
exposes them, exactly as for MACD:

| Language | Exact batch | Fast batch |
|----------|-------------|------------|
| Python | `MACDFIX.batch` → `(n, 3)` `Matrix` | `MACDFIX.batch_fast` → `(n, 3)` `Matrix` |
| Node | `batch` → flat `Array<number>`; `batchInto(prices, out)` | `batchFast` → flat `Float64Array`; `batchFastInto(prices, out)` |
| WASM | `batch` → flat `Float64Array`; `batchInto(prices, out)` | `batchFast` → flat `Float64Array`; `batchFastInto(prices, out)` |
| C ABI | `wickra_macd_fix_batch` | `wickra_macd_fix_batch_fast` |
| C# / Go | `Batch` | `BatchFast` |
| Java | `batch` / `batchInto` | `batchFast` / `batchFastInto` |
| R | `batch()` | `batch_fast()` |

The Node and WASM flat layouts are `[macd0, signal0, histogram0, macd1, ...]`;
the `Into` forms need an output of length `3 · n`. See
[Streaming vs Batch](/Streaming-vs-Batch#the-opt-in-fast-batch) for the
fast-batch contract.

## Warmup

`MacdFix::new(signal).warmup_period()` equals
`MacdIndicator::new(12, 26, signal).warmup_period()` — the slow EMA must seed and
then the signal EMA must seed on top of it. The unit test
`accessors_report_config` pins this equality directly.

## Edge cases

- **Fixed smoothing constants.** `MacdFix::new(s)`'s MACD line equals an
  SMA-seeded `α = 0.15` EMA minus an SMA-seeded `α = 0.075` EMA, and differs from
  `MacdIndicator::new(12, 26, s)` on the same series. The unit test
  `uses_the_fixed_smoothing_constants` pins both.
- **Flat batch.** `batch_macd` matches streaming bit for bit
  (`flat_batch_matches_streaming`).
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

m = ta.MACDFIX(9)
out = m.batch(np.full(60, 100.0))   # (60, 3) Matrix
print(out[-1])   # last row: macd, signal, histogram
```

Output:

```
array('d', [0.0, 0.0, 0.0])
```

The fast batch has the same shape and agrees with `batch` to within a few units
in the last place:

```python
import math
import wickra as ta

x = [100 + 5 * math.sin(0.3 * i) for i in range(80)]
exact = ta.MACDFIX(9).batch(x)
fast = ta.MACDFIX(9).batch_fast(x)
print([round(v, 6) for v in exact[-1]])
print([round(v, 6) for v in fast[-1]])
```

Output:

```
[-1.039229, -0.18508, -0.854149]
[-1.039229, -0.18508, -0.854149]
```

### Node

```javascript
const ta = require('wickra');
const m = new ta.MACDFIX(9);
let last = null;
for (let i = 0; i < 60; i++) last = m.update(100);
console.log(last);
```

Output:

```
{ macd: 0, signal: 0, histogram: 0 }
```

The flat batches write `[macd, signal, histogram]` per row:

```javascript
const ta = require('wickra');
const x = Float64Array.from({ length: 80 }, (_, i) => 100 + 5 * Math.sin(0.3 * i));
const out = new Float64Array(x.length * 3);
new ta.MACDFIX(9).batchInto(x, out);              // exact, into a reused buffer
console.log(Array.from(out.slice(-3), (v) => +v.toFixed(6)));
const fast = new ta.MACDFIX(9).batchFast(x);      // Float64Array, NaN during warmup
console.log(Array.from(fast.slice(-3), (v) => +v.toFixed(6)));
```

Output:

```
[ -1.039229, -0.18508, -0.854149 ]
[ -1.039229, -0.18508, -0.854149 ]
```

## Interpretation

`MacdFix` is TA-Lib's fixed-constant MACD(12, 26, 9) momentum oscillator. Read it
the standard way: `macd` crossing its `signal` line is the primary trade trigger, the
`histogram` (their difference) shows momentum building or fading, and `macd`
crossing zero marks the fast/slow EMA crossover. Use `MacdFix` when you need to
reproduce TA-Lib's `MACDFIX`; use
[`MacdIndicator`](/Indicators/Indicator-MacdIndicator) when you need non-standard fast/slow lengths.

## Common pitfalls

- **Expecting to change fast/slow.** They are fixed at 12/26 by design; reach for
  [`MacdIndicator`](/Indicators/Indicator-MacdIndicator) to vary them.
- **Treating it as an alias of `MACD(12, 26, 9)`.** The `0.15` / `0.075` constants
  make the values differ slightly from `MacdIndicator::new(12, 26, 9)`; on
  `100 + 5·sin(0.3·i)` for 80 bars the last MACD value is `-1.0392` for `MacdFix`
  versus `-1.1066` for `MacdIndicator`.
- **Comparing histograms across instruments.** MACD is in price units, so its
  scale depends on the instrument; normalise (e.g. by ATR) before comparing.

## References

Gerald Appel's MACD (1979); the fixed-12/26 packaging and the `0.15` / `0.075`
smoothing constants match TA-Lib's `MACDFIX`.

## See also

- [Indicator-MacdIndicator](/Indicators/Indicator-MacdIndicator) — the fully configurable MACD.
- [Indicator-MacdExt](/Indicators/Indicator-MacdExt) — MACD with selectable moving-average types.
- [Indicators-Overview](/Indicators-Overview) — the full taxonomy.
