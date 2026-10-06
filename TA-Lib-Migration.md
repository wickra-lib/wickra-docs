---
description: "Port TA-Lib code to Wickra: a function-by-function lookup table from talib.X(...) to the matching Wickra indicator, with argument-order conventions."
---

# Migrating from TA-Lib

A quick lookup table for users porting code from TA-Lib (the C library, or
its Python binding `talib`) to Wickra. Replace `talib.X(...)` with the
matching Wickra expression and the rest of your code keeps working.

## Argument-order conventions

The two libraries take the same numeric arguments but differ in shape:

- **TA-Lib (Python)** is functional and pass-by-array. `talib.RSI(close, n)`
  is a *recompute-everything* call: it walks the entire `close` series each
  time, even when you only want the latest value.
- **Wickra** is a state machine. `wickra.RSI(n)` returns an *instance*; you
  call `.batch(close)` for the full series or `.update(price)` one price at
  a time. The same instance, fed one price per minute, drives a live
  trading bot — see [Streaming vs Batch](Streaming-vs-Batch).

Multi-output indicators (MACD, Bollinger Bands, Stochastic, ADX, Aroon,
Keltner, Donchian, SuperTrend, …) return a tuple from `update` and a `Matrix`
(one column per output, with `.shape` and `[i, j]` access) from `batch` — no
NumPy required.

TA-Lib's functions reorder nothing and promise no agreement with a streaming
path; Wickra's `batch` is bit for bit its `update`. For a backfill where
throughput matters more than that, `batch_fast` takes the same arguments and
runs SIMD kernels within a few units in the last place of `batch` — see
[Streaming vs Batch](Streaming-vs-Batch#the-opt-in-fast-batch).

The names in the table below are the Python/Node.js/WASM aliases. C#, Go, Java
and R use the canonical PascalCase name instead — see
[Naming across bindings](Indicators-Overview#naming-across-bindings) for the
full alias map.

## Mapping table

| TA-Lib                                              | Wickra (Python)                                                                                  |
|-----------------------------------------------------|--------------------------------------------------------------------------------------------------|
| `talib.SMA(close, n)`                               | `wickra.SMA(n).batch(close)`                                                                     |
| `talib.EMA(close, n)`                               | `wickra.EMA(n).batch(close)`                                                                     |
| `talib.WMA(close, n)`                               | `wickra.WMA(n).batch(close)`                                                                     |
| `talib.DEMA(close, n)`                              | `wickra.DEMA(n).batch(close)`                                                                    |
| `talib.TEMA(close, n)`                              | `wickra.TEMA(n).batch(close)`                                                                    |
| `talib.KAMA(close, n)`                              | `wickra.KAMA(n).batch(close)`                                                                    |
| `talib.T3(close, n, vfactor)`                       | `wickra.T3(n, vfactor).batch(close)`                                                             |
| `talib.RSI(close, n)`                               | `wickra.RSI(n).batch(close)`                                                                     |
| `talib.STOCH(high, low, close, k, smooth, d)`       | `wickra.Stochastic(k_period, d_period).batch(high, low, close)` → shape `(n, 2)`                 |
| `talib.STOCHRSI(close, n, k, d)`                    | `wickra.StochRSI(rsi_period, stoch_period).batch(close)`                                         |
| `talib.CCI(high, low, close, n)`                    | `wickra.CCI(n).batch(high, low, close)`                                                          |
| `talib.WILLR(high, low, close, n)`                  | `wickra.WilliamsR(n).batch(high, low, close)`                                                    |
| `talib.MFI(high, low, close, volume, n)`            | `wickra.MFI(n).batch(high, low, close, volume)`                                                  |
| `talib.ROC(close, n)`                               | `wickra.ROC(n).batch(close)`                                                                     |
| `talib.MOM(close, n)`                               | `wickra.MOM(n).batch(close)`                                                                     |
| `talib.CMO(close, n)`                               | `wickra.CMO(n).batch(close)`                                                                     |
| `talib.MACD(close, fast, slow, signal)`             | `wickra.MACD(fast, slow, signal).batch(close)` → shape `(n, 3)`                                  |
| `talib.PPO(close, fast, slow)`                      | `wickra.PPO(fast, slow).batch(close)`                                                            |
| `talib.APO(close, fast, slow)`                      | `wickra.PPO(fast, slow).batch(close)` *(PPO is APO scaled to percent)*                           |
| `talib.TRIX(close, n)`                              | `wickra.TRIX(n).batch(close)`                                                                    |
| `talib.ADX(high, low, close, n)`                    | `wickra.ADX(n).batch(high, low, close)` → shape `(n, 3)` (`+DI`, `−DI`, `ADX`)                   |
| `talib.AROON(high, low, n)`                         | `wickra.Aroon(n).batch(high, low, close)` → shape `(n, 2)`                                       |
| `talib.AROONOSC(high, low, n)`                      | `wickra.AroonOscillator(n).batch(high, low, close)`                                              |
| `talib.BBANDS(close, n, dev_up, dev_dn)`            | `wickra.BollingerBands(n, multiplier).batch(close)` → shape `(n, 4)` (`upper`, `middle`, `lower`, `stddev`) |
| `talib.ATR(high, low, close, n)`                    | `wickra.ATR(n).batch(high, low, close)`                                                          |
| `talib.NATR(high, low, close, n)`                   | `wickra.NATR(n).batch(high, low, close)`                                                         |
| `talib.STDDEV(close, n)`                            | `wickra.StdDev(n).batch(close)`                                                                  |
| `talib.TRANGE(high, low, close)`                    | `wickra.TrueRange().batch(high, low, close)`                                                     |
| `talib.OBV(close, volume)`                          | `wickra.OBV().batch(close, volume)`                                                              |
| `talib.AD(high, low, close, volume)`                | `wickra.ADL().batch(high, low, close, volume)`                                                   |
| `talib.ADOSC(high, low, close, volume, fast, slow)` | `wickra.ChaikinOscillator(fast, slow).batch(high, low, close, volume)`                           |
| `talib.SAR(high, low, accel, max)`                  | `wickra.PSAR(accel_start, accel_step, accel_max).batch(high, low, close)`                        |
| `talib.SAREXT(high, low, start, offset, ...)`       | `wickra.SAREXT(start, offset, ...).batch(high, low, close)` *(signed, like TA-Lib)*              |
| `talib.MACDFIX(close, signal)`                      | `wickra.MACDFIX(signal).batch(close)` → shape `(n, 3)`                                           |
| `talib.LINEARREG(close, n)`                         | `wickra.LinearRegression(n).batch(close)`                                                        |
| `talib.LINEARREG_SLOPE(close, n)`                   | `wickra.LinRegSlope(n).batch(close)`                                                             |
| `talib.LINEARREG_ANGLE(close, n)`                   | `wickra.LinRegAngle(n).batch(close)`                                                             |
| `talib.TYPPRICE(high, low, close)`                  | `wickra.TypicalPrice().batch(high, low, close)`                                                  |
| `talib.MEDPRICE(high, low)`                         | `wickra.MedianPrice().batch(high, low, close)`                                                   |
| `talib.WCLPRICE(high, low, close)`                  | `wickra.WeightedClose().batch(high, low, close)`                                                 |
| `talib.ULTOSC(high, low, close, p1, p2, p3)`        | `wickra.UltimateOscillator(p1, p2, p3).batch(high, low, close)`                                  |

## Verified against TA-Lib

The Wickra repository carries a TA-Lib reference test suite
(`crates/wickra-core/tests/talib_reference.rs`). A generator script
(`scripts/gen_talib_reference.py`) runs the real TA-Lib library over fixed
input series — an 80-bar golden series, a 3000-bar OHLCV series and a
candlestick pattern series — and commits TA-Lib's output as CSV fixtures under
`testdata/talib/`. The test recomputes every series with Wickra, both
streaming and in one `batch` call, checks that the two paths are bit-identical,
and compares the result with TA-Lib's to a tolerance of `1e-9` (absolute below
magnitude 1, relative above it). Candlestick signals must match exactly, with
Wickra's `+1` / `-1` / `0` against TA-Lib's `+100` / `-100` / `0`.

| TA-Lib | Wickra (Python) | Agreement |
|--------|--------|-----------|
| `ACCBANDS(20)` | [`AccelerationBands(20, 4.0)`](/Indicators/Indicator-AccelerationBands) | exact from the first bar |
| `SAR(0.02, 0.2)` | [`PSAR(0.02, 0.02, 0.2)`](/Indicators/Indicator-Psar) | exact from the first bar |
| `SAREXT` (defaults) | [`SAREXT()`](/Indicators/Indicator-SarExt) | exact from the first bar, including the signed output |
| `MACDFIX(9)` | [`MACDFIX(9)`](/Indicators/Indicator-MacdFix) | identical from bar 164 |
| `ADOSC(3, 10)` | [`ChaikinOscillator(3, 10)`](/Indicators/Indicator-ChaikinOscillator) | identical from bar 120 |
| `HT_DCPERIOD` | [`HilbertDominantCycle()`](/Indicators/Indicator-HilbertDominantCycle) | identical from bar 186 |
| `HT_DCPHASE` | [`HT_DCPHASE()`](/Indicators/Indicator-HtDcPhase) | identical from bar 202 |
| `HT_PHASOR` | [`HT_PHASOR()`](/Indicators/Indicator-HtPhasor) | identical from bar 189 |
| `HT_SINE` | [`SineWave()`](/Indicators/Indicator-SineWave) | identical from bar 193 (sine and lead sine) |
| `HT_TRENDMODE` | [`HT_TRENDMODE()`](/Indicators/Indicator-HtTrendMode) | identical from bar 75 |
| `MAMA(0.5, 0.05)` | [`MAMA(0.5, 0.05)`](/Indicators/Indicator-Mama) | MAMA from bar 152, [FAMA](/Indicators/Indicator-Fama) from bar 316 |
| `CDLMORNINGSTAR` / `CDLEVENINGSTAR` (`penetration = 0.3`) | [`MorningEveningStar()`](/Indicators/Indicator-MorningEveningStar) | identical signals |
| `CDLRISEFALL3METHODS` | [`RisingThreeMethods()`](/Indicators/Indicator-RisingThreeMethods) + [`FallingThreeMethods()`](/Indicators/Indicator-FallingThreeMethods) | identical signals |
| `CDLLADDERBOTTOM` | [`LadderBottom()`](/Indicators/Indicator-LadderBottom) | identical signals |
| `CDLTRISTAR` | [`Tristar()`](/Indicators/Indicator-Tristar) | identical signals |
| `CDLHIKKAKEMOD` | [`HikkakeModified()`](/Indicators/Indicator-HikkakeModified) | identical setup-bar signals |

The bar numbers are 0-based indices on the 3000-bar series; from that bar to
the end of the series every value is within `1e-9`. Where a function is not
exact from its first bar, the difference is in the start-up only:

- **EMA seeds (`MACDFIX`, `ADOSC`).** Both emit their first value on the same
  bar as TA-Lib, but Wickra seeds each EMA with the SMA of its own first
  window. TA-Lib aligns the fast MACD EMA's seed with the slow one, and seeds
  both `ADOSC` EMAs with the first A/D value. The seed difference decays
  geometrically and is below `1e-9` from bar 164 (`MACDFIX`) and bar 120
  (`ADOSC`) on. (TA-Lib's `ADOSC` is Wickra's
  [`ChaikinOscillator`](/Indicators/Indicator-ChaikinOscillator), not
  [`AdOscillator`](/Indicators/Indicator-AdOscillator).)
- **Hilbert start-up (`HT_*`, `MAMA`).** TA-Lib primes its Hilbert-transform
  state with zeros after a WMA burn-in; Wickra waits for its tap buffers to
  fill. The two then run the same recursion and converge by the bars listed
  above (186 / 202 / 189 / 193 / 75 / 152 / 316 for `HT_DCPERIOD`,
  `HT_DCPHASE`, `HT_PHASOR`, `HT_SINE`, `HT_TRENDMODE`, `MAMA`, `FAMA`). These
  are properties of the start-up, not of the series length.
- **Candlestick sizing.** TA-Lib sizes bodies and shadows against 5- or 10-bar
  rolling averages ("candle settings"); Wickra sizes them against the
  pattern's own bars (for example, a doji is a body of at most a tenth of the
  bar's range). The pattern series is built from neutral bars with constant
  body and range so that both schemes agree on which bodies are long, short or
  doji; the pattern rules themselves (colours, gaps, penetration, nesting,
  closes) give identical signals, and the near misses next to each pattern
  fire in neither library. On real data, where bar sizes vary, the two sizing
  schemes can classify a borderline body differently.
- **`CDLHIKKAKEMOD` confirmation.** TA-Lib emits `±100` on the setup bar and
  `±200` on a later confirmation bar. Wickra's `HikkakeModified` flags only the
  setup bar.

## What Wickra has that TA-Lib does not

Wickra ships several whole *families* that have no TA-Lib equivalent. These
are the main reasons to reach for Wickra over a TA-Lib port:

- **Risk & performance metrics** — a full streaming risk suite TA-Lib has
  nothing comparable to: [SharpeRatio](/Indicators/Indicator-SharpeRatio),
  [SortinoRatio](/Indicators/Indicator-SortinoRatio), [CalmarRatio](/Indicators/Indicator-CalmarRatio),
  [TreynorRatio](/Indicators/Indicator-TreynorRatio),
  [InformationRatio](/Indicators/Indicator-InformationRatio),
  [OmegaRatio](/Indicators/Indicator-OmegaRatio), [MaxDrawdown](/Indicators/Indicator-MaxDrawdown),
  [AverageDrawdown](/Indicators/Indicator-AverageDrawdown),
  [DrawdownDuration](/Indicators/Indicator-DrawdownDuration),
  [UlcerIndex](/Indicators/Indicator-UlcerIndex), [PainIndex](/Indicators/Indicator-PainIndex),
  [ValueAtRisk](/Indicators/Indicator-ValueAtRisk),
  [ConditionalValueAtRisk](/Indicators/Indicator-ConditionalValueAtRisk),
  [KellyCriterion](/Indicators/Indicator-KellyCriterion),
  [ProfitFactor](/Indicators/Indicator-ProfitFactor),
  [GainLossRatio](/Indicators/Indicator-GainLossRatio),
  [RecoveryFactor](/Indicators/Indicator-RecoveryFactor), plus
  [Beta](/Indicators/Indicator-Beta), [Alpha](/Indicators/Indicator-Alpha) and
  [RSquared](/Indicators/Indicator-RSquared).
- **DeMark studies** — the full Tom DeMark toolkit:
  [TdSequential](/Indicators/Indicator-TdSequential), [TdSetup](/Indicators/Indicator-TdSetup),
  [TdCountdown](/Indicators/Indicator-TdCountdown), [TdCombo](/Indicators/Indicator-TdCombo),
  [TdDeMarker](/Indicators/Indicator-TdDeMarker),
  [TdDifferential](/Indicators/Indicator-TdDifferential), [TdLines](/Indicators/Indicator-TdLines),
  [TdOpen](/Indicators/Indicator-TdOpen), [TdPressure](/Indicators/Indicator-TdPressure),
  [TdRei](/Indicators/Indicator-TdRei),
  [TdRangeProjection](/Indicators/Indicator-TdRangeProjection),
  [TdRiskLevel](/Indicators/Indicator-TdRiskLevel) and
  [DemarkPivots](/Indicators/Indicator-DemarkPivots).
- **Candlestick patterns** — Wickra implements the common single- and
  multi-bar patterns directly (each emits a signed signal, no separate
  `CDL*` call per pattern): [Doji](/Indicators/Indicator-Doji),
  [Hammer](/Indicators/Indicator-Hammer), [InvertedHammer](/Indicators/Indicator-InvertedHammer),
  [HangingMan](/Indicators/Indicator-HangingMan), [ShootingStar](/Indicators/Indicator-ShootingStar),
  [Engulfing](/Indicators/Indicator-Engulfing), [Harami](/Indicators/Indicator-Harami),
  [PiercingDarkCloud](/Indicators/Indicator-PiercingDarkCloud),
  [MorningEveningStar](/Indicators/Indicator-MorningEveningStar),
  [Marubozu](/Indicators/Indicator-Marubozu), [SpinningTop](/Indicators/Indicator-SpinningTop),
  [Tweezer](/Indicators/Indicator-Tweezer), [ThreeInside](/Indicators/Indicator-ThreeInside),
  [ThreeOutside](/Indicators/Indicator-ThreeOutside) and
  [ThreeSoldiersOrCrows](/Indicators/Indicator-ThreeSoldiersOrCrows).
- **Market-profile / session studies** — [ValueArea](/Indicators/Indicator-ValueArea),
  [InitialBalance](/Indicators/Indicator-InitialBalance),
  [OpeningRange](/Indicators/Indicator-OpeningRange) and
  [MarketFacilitationIndex](/Indicators/Indicator-MarketFacilitationIndex).
- **Trailing stops** — [SuperTrend](/Indicators/Indicator-SuperTrend),
  [ChandelierExit](/Indicators/Indicator-ChandelierExit),
  [ChandeKrollStop](/Indicators/Indicator-ChandeKrollStop),
  [AtrTrailingStop](/Indicators/Indicator-AtrTrailingStop) (TA-Lib only has `SAR`).
- **Volume oscillators** — [ChaikinMoneyFlow](/Indicators/Indicator-ChaikinMoneyFlow),
  [ForceIndex](/Indicators/Indicator-ForceIndex), [EaseOfMovement](/Indicators/Indicator-EaseOfMovement),
  [VolumePriceTrend](/Indicators/Indicator-VolumePriceTrend), plus the windowed
  [RollingVwap](/Indicators/Indicator-RollingVwap).
- **Other modern indicators** — [ChoppinessIndex](/Indicators/Indicator-ChoppinessIndex),
  [VerticalHorizontalFilter](/Indicators/Indicator-VerticalHorizontalFilter),
  [Coppock](/Indicators/Indicator-Coppock), [Pmo](/Indicators/Indicator-Pmo), [ZScore](/Indicators/Indicator-ZScore),
  [MassIndex](/Indicators/Indicator-MassIndex), [Vortex](/Indicators/Indicator-Vortex), [Tsi](/Indicators/Indicator-Tsi),
  [Smma](/Indicators/Indicator-Smma), [Trima](/Indicators/Indicator-Trima), [Zlema](/Indicators/Indicator-Zlema),
  [Vwma](/Indicators/Indicator-Vwma), [BollingerBandwidth](/Indicators/Indicator-BollingerBandwidth),
  [PercentB](/Indicators/Indicator-PercentB).

See the [Indicators Overview](Indicators-Overview) for the complete catalogue
organised by family.

## What TA-Lib has that Wickra does not (yet)

- The *long tail* of `CDL*` candlestick patterns. Wickra covers the common
  ones (see the candlestick list above), but TA-Lib's ~60-pattern catalogue
  includes many rare formations Wickra does not yet implement.
- A few trivial transforms (`AVGPRICE`, `MIDPOINT`, `MIDPRICE`).

(Hilbert-transform studies are covered: Wickra ships
[HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle),
[InstantaneousTrendline](/Indicators/Indicator-InstantaneousTrendline) and the related
Ehlers cycle indicators.)

If you need one of these,
[open an issue](https://github.com/wickra-lib/wickra/issues) — most are
short additions on top of the existing engine.

## See also

- [Indicators Overview](Indicators-Overview) — every Wickra indicator,
  organised by family.
- [Quickstart: Python](Quickstart-Python) — concrete Python usage.
- [Streaming vs Batch](Streaming-vs-Batch) — why Wickra is fast at
  per-tick updates while TA-Lib re-computes the whole series.
