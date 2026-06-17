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
| `talib.LINEARREG(close, n)`                         | `wickra.LinearRegression(n).batch(close)`                                                        |
| `talib.LINEARREG_SLOPE(close, n)`                   | `wickra.LinRegSlope(n).batch(close)`                                                             |
| `talib.LINEARREG_ANGLE(close, n)`                   | `wickra.LinRegAngle(n).batch(close)`                                                             |
| `talib.TYPPRICE(high, low, close)`                  | `wickra.TypicalPrice().batch(high, low, close)`                                                  |
| `talib.MEDPRICE(high, low)`                         | `wickra.MedianPrice().batch(high, low, close)`                                                   |
| `talib.WCLPRICE(high, low, close)`                  | `wickra.WeightedClose().batch(high, low, close)`                                                 |
| `talib.ULTOSC(high, low, close, p1, p2, p3)`        | `wickra.UltimateOscillator(p1, p2, p3).batch(high, low, close)`                                  |

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
