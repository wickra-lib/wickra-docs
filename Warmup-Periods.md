# Warmup Periods

Every Wickra indicator returns `None` (Rust), `None` (Python), or `null`
(Node) for its first few inputs while it gathers enough data to produce a
defined value. The number of inputs an indicator needs before it emits its
first non-empty value is its **warmup period**, surfaced everywhere as
`warmup_period()` / `warmupPeriod()`.

After the first emission, the indicator never goes back to a "no value yet"
state — it has rolled its state forward and will produce a steady value on
every subsequent `update()`. Calling `reset()` returns to the warming-up
state, equivalent to a freshly constructed instance.

## How to read the formula column

The formulas below are taken verbatim from the `warmup_period()` methods in
`crates/wickra-core/src/indicators/<name>.rs`. The "Inputs at first
emission" column says, in 1-indexed terms, which `update()` call returns the
first `Some`/non-`NaN` value. They are the same number; "first emission
index" in 0-indexed terms is `warmup_period − 1`.

## Single-output indicators

> The rows are keyed by **constructor**, not by indicator name. `Vwap`
> appears twice — once for the cumulative `Vwap::new()` and once for the
> finite-window `RollingVwap::new(period)` — because the two share the
> indicator name `Vwap` (see [Indicators-Overview](Indicators-Overview))
> but have different warmup periods. That is the only such pair; every other
> row is one canonical indicator.

| Indicator       | Constructor                                  | Formula                          | `warmup_period()` for shown args | Inputs at first emission |
|-----------------|----------------------------------------------|----------------------------------|----------------------------------|--------------------------|
| `Sma`           | `Sma::new(14)`                               | `period`                         | 14                               | 14th                     |
| `Ema`           | `Ema::new(14)`                               | `period`                         | 14                               | 14th                     |
| `Wma`           | `Wma::new(14)`                               | `period`                         | 14                               | 14th                     |
| `Dema`          | `Dema::new(14)`                              | `2 * period - 1`                 | 27                               | 27th                     |
| `Tema`          | `Tema::new(14)`                              | `3 * period - 2`                 | 40                               | 40th                     |
| `Hma`           | `Hma::new(14)`                               | `period + round(sqrt(period)).max(1) - 1` | 17                      | 17th                     |
| `Kama`          | `Kama::new(10, 2, 30)`                       | `er_period + 1`                  | 11                               | 11th                     |
| `Rsi`           | `Rsi::new(14)`                               | `period + 1`                     | 15                               | 15th                     |
| `AnchoredRsi`   | `AnchoredRsi::new()`                          | constant `2`                     | 2                                | 2nd                      |
| `Cci`           | `Cci::new(20)`                               | `period`                         | 20                               | 20th                     |
| `Roc`           | `Roc::new(12)`                               | `period + 1`                     | 13                               | 13th                     |
| `Rocp`          | `Rocp::new(12)`                              | `period + 1`                     | 13                               | 13th                     |
| `Rocr`          | `Rocr::new(12)`                              | `period + 1`                     | 13                               | 13th                     |
| `Rocr100`       | `Rocr100::new(12)`                           | `period + 1`                     | 13                               | 13th                     |
| `PlusDm`        | `PlusDm::new(14)`                            | `period` (1st candle seeds prev) | 14                               | 15th                     |
| `MinusDm`       | `MinusDm::new(14)`                           | `period` (1st candle seeds prev) | 14                               | 15th                     |
| `PlusDi`        | `PlusDi::new(14)`                            | `period` (1st candle seeds prev) | 14                               | 15th                     |
| `MinusDi`       | `MinusDi::new(14)`                           | `period` (1st candle seeds prev) | 14                               | 15th                     |
| `Dx`            | `Dx::new(14)`                                | `period` (1st candle seeds prev) | 14                               | 15th                     |
| `WilliamsR`     | `WilliamsR::new(14)`                         | `period`                         | 14                               | 14th                     |
| `Mfi`           | `Mfi::new(14)`                               | `period`                         | 14                               | 14th                     |
| `Trix`          | `Trix::new(15)`                              | `3 * period - 1`                 | 44                               | 44th                     |
| `AwesomeOscillator` | `AwesomeOscillator::new(5, 34)`          | `slow_period`                    | 34                               | 34th                     |
| `Atr`           | `Atr::new(14)`                               | `period`                         | 14                               | 14th                     |
| `Psar`          | `Psar::new(0.02, 0.02, 0.20)`                | constant `2`                     | 2                                | 2nd                      |
| `Obv`           | `Obv::new()`                                 | constant `1`                     | 1                                | 1st                      |
| `Vwap`          | `Vwap::new()`                                | constant `1`                     | 1                                | 1st                      |
| `RollingVwap`   | `RollingVwap::new(20)`                       | `period`                         | 20                               | 20th                     |
| `Smma`          | `Smma::new(14)`                              | `period`                         | 14                               | 14th                     |
| `Trima`         | `Trima::new(20)`                             | `period`                         | 20                               | 20th                     |
| `Zlema`         | `Zlema::new(14)`                             | `lag + period` (`lag = (period − 1) / 2`) | 20                      | 20th                     |
| `T3`            | `T3::new(5, 0.7)`                            | `6 * period - 5`                 | 25                               | 25th                     |
| `Vwma`          | `Vwma::new(20)`                              | `period`                         | 20                               | 20th                     |
| `Alma`          | `Alma::new(9, 0.85, 6.0)`                    | `period`                         | 9                                | 9th                      |
| `McGinleyDynamic` | `McGinleyDynamic::new(10)`                 | `period`                         | 10                               | 10th                     |
| `Frama`         | `Frama::new(16)`                             | `period`                         | 16                               | 16th                     |
| `Vidya`         | `Vidya::new(14, 9)`                          | `cmo_period + 1`                 | 10                               | 10th                     |
| `Jma`           | `Jma::new(14, 0.0, 2)`                       | constant `1`                     | 1                                | 1st                      |
| `Evwma`         | `Evwma::new(20)`                             | `period`                         | 20                               | 20th                     |
| `Mom`           | `Mom::new(10)`                               | `period + 1`                     | 11                               | 11th                     |
| `Cmo`           | `Cmo::new(14)`                               | `period + 1`                     | 15                               | 15th                     |
| `Tsi`           | `Tsi::new(25, 13)`                           | `long + short`                   | 38                               | 38th                     |
| `Pmo`           | `Pmo::new(35, 20)`                           | constant `2`                     | 2                                | 2nd                      |
| `StochRsi`      | `StochRsi::new(14, 14)`                      | `rsi_period + stoch_period`      | 28                               | 28th                     |
| `UltimateOscillator` | `UltimateOscillator::new(7, 14, 28)`    | `max(short, mid, long) + 1`      | 29                               | 29th                     |
| `Rvi`           | `Rvi::new(10)`                               | `period`                         | 10                               | 10th                     |
| `Pgo`           | `Pgo::new(14)`                               | `period`                         | 14                               | 14th                     |
| `Smi`           | `Smi::new(5, 3, 3)`                          | `period + d_period + d2_period − 2` | 9                             | 9th                      |
| `LaguerreRsi`   | `LaguerreRsi::new(0.5)`                      | constant `1`                     | 1                                | 1st                      |
| `ConnorsRsi`    | `ConnorsRsi::new(3, 2, 100)`                 | `max(period_rsi+1, period_streak+2, period_rank+1)` | 101            | 101st                    |
| `Inertia`       | `Inertia::new(14, 20)`                       | `rvi_period + linreg_period − 1` | 33                               | 33rd                     |
| `Ppo`           | `Ppo::new(12, 26)`                           | `slow`                           | 26                               | 26th                     |
| `Dpo`           | `Dpo::new(20)`                               | `max(period, period / 2 + 2)`    | 20                               | 20th                     |
| `Coppock`       | `Coppock::new(14, 11, 10)`                   | `max(roc_long, roc_short) + wma_period` | 24                        | 24th                     |
| `AroonOscillator` | `AroonOscillator::new(14)`                 | `period + 1`                     | 15                               | 15th                     |
| `MassIndex`     | `MassIndex::new(9, 25)`                      | `2 * ema_period + sum_period - 2` | 41                              | 41st                     |
| `Natr`          | `Natr::new(14)`                              | `period`                         | 14                               | 14th                     |
| `StdDev`        | `StdDev::new(20)`                            | `period`                         | 20                               | 20th                     |
| `UlcerIndex`    | `UlcerIndex::new(14)`                        | `2 * period - 1`                 | 27                               | 27th                     |
| `HistoricalVolatility` | `HistoricalVolatility::new(20, 252)`  | `period + 1`                     | 21                               | 21st                     |
| `BollingerBandwidth` | `BollingerBandwidth::new(20, 2.0)`      | `period`                         | 20                               | 20th                     |
| `PercentB`      | `PercentB::new(20, 2.0)`                     | `period`                         | 20                               | 20th                     |
| `AtrTrailingStop` | `AtrTrailingStop::new(14, 3.0)`            | `atr_period`                     | 14                               | 14th                     |
| `Adl`           | `Adl::new()`                                 | constant `1`                     | 1                                | 1st                      |
| `VolumePriceTrend` | `VolumePriceTrend::new()`                 | constant `1`                     | 1                                | 1st                      |
| `ChaikinMoneyFlow` | `ChaikinMoneyFlow::new(20)`               | `period`                         | 20                               | 20th                     |
| `ChaikinOscillator` | `ChaikinOscillator::new(3, 10)`          | `slow`                           | 10                               | 10th                     |
| `ForceIndex`    | `ForceIndex::new(13)`                        | `period + 1`                     | 14                               | 14th                     |
| `EaseOfMovement` | `EaseOfMovement::new(14)`                   | `period + 1`                     | 15                               | 15th                     |
| `TypicalPrice`  | `TypicalPrice::new()`                        | constant `1`                     | 1                                | 1st                      |
| `MedianPrice`   | `MedianPrice::new()`                         | constant `1`                     | 1                                | 1st                      |
| `WeightedClose` | `WeightedClose::new()`                       | constant `1`                     | 1                                | 1st                      |
| `LinearRegression` | `LinearRegression::new(14)`               | `period`                         | 14                               | 14th                     |
| `LinRegSlope`   | `LinRegSlope::new(14)`                       | `period`                         | 14                               | 14th                     |
| `AcceleratorOscillator` | `AcceleratorOscillator::classic()`   | `ao_slow + signal_period - 1`    | 38                               | 38th                     |
| `BalanceOfPower` | `BalanceOfPower::new()`                     | constant `1`                     | 1                                | 1st                      |
| `ChoppinessIndex` | `ChoppinessIndex::new(14)`                 | `period`                         | 14                               | 14th                     |
| `VerticalHorizontalFilter` | `VerticalHorizontalFilter::new(28)` | `period + 1`                  | 29                               | 29th                     |
| `TrueRange`     | `TrueRange::new()`                           | constant `1`                     | 1                                | 1st                      |
| `ChaikinVolatility` | `ChaikinVolatility::new(10, 10)`         | `ema_period + roc_period`        | 20                               | 20th                     |
| `ZScore`        | `ZScore::new(20)`                            | `period`                         | 20                               | 20th                     |
| `LinRegAngle`   | `LinRegAngle::new(14)`                       | `period`                         | 14                               | 14th                     |
| `RviVolatility` | `RviVolatility::new(10)`                     | `2 * period - 1`                 | 19                               | 19th                     |
| `ParkinsonVolatility` | `ParkinsonVolatility::new(20, 252)`    | `period`                         | 20                               | 20th                     |
| `GarmanKlassVolatility` | `GarmanKlassVolatility::new(20, 252)` | `period`                        | 20                               | 20th                     |
| `RogersSatchellVolatility` | `RogersSatchellVolatility::new(20, 252)` | `period`                  | 20                               | 20th                     |
| `YangZhangVolatility` | `YangZhangVolatility::new(20, 252)`    | `period + 1`                     | 21                               | 21st                     |
| `Adxr`          | `Adxr::new(14)`                              | `3 * period - 1`                 | 41                               | 41st                     |
| `Tii`           | `Tii::new(60, 30)`                           | `sma_period + dev_period - 1`    | 89                               | 89th                     |

### Family 05: Bands & Channels (scalar input, scalar projection)

These rows track the **single-output** Bands & Channels — `MaEnvelope`,
`AccelerationBands`, `StarcBands`, `AtrBands`, `HurstChannel`,
`LinRegChannel`, `StandardErrorBands` all emit a multi-output struct
(`upper / middle / lower`). They are listed in the multi-output section
below for completeness; their warmup is included here only so the
single-output reader does not have to jump:

| Indicator | Warmup formula |
|-----------|----------------|
| `MaEnvelope` | `period` |
| `LinRegChannel` | `period` |
| `StandardErrorBands` | `period` (constructor enforces `period >= 3`) |

## Multi-output indicators

These indicators emit several values at once (a struct in Rust, a tuple in
Python, an object in Node) and every column / field transitions from "not
ready" to "ready" together — there are no rows that have a `signal` but no
`macd`, for example.

| Indicator         | Constructor                          | Formula                                  | `warmup_period()` for shown args | Inputs at first emission | Outputs                                                |
|-------------------|--------------------------------------|------------------------------------------|----------------------------------|--------------------------|--------------------------------------------------------|
| `MacdIndicator`   | `MacdIndicator::new(12, 26, 9)`      | `slow + signal - 1`                      | 34                               | 34th                     | `macd`, `signal`, `histogram`                          |
| `MacdFix`         | `MacdFix::new(9)`                    | `slow + signal - 1` (fast/slow = 12/26)  | 34                               | 34th                     | `macd`, `signal`, `histogram`                          |
| `MacdExt`         | `MacdExt::new(12, Ema, 26, Ema, 9, Ema)` | `slow.warmup + signal.warmup`        | 35                               | 35th                     | `macd`, `signal`, `histogram`                          |
| `BollingerBands`  | `BollingerBands::new(20, 2.0)`       | `period`                                 | 20                               | 20th                     | `upper`, `middle`, `lower`, `stddev`                   |
| `Stochastic`      | `Stochastic::new(14, 3)`             | `k_period + d_period - 1`                | 16                               | 16th                     | `k`, `d`                                               |
| `Adx`             | `Adx::new(14)`                       | `2 * period`                             | 28                               | 28th                     | `plus_di`, `minus_di`, `adx`                           |
| `Aroon`           | `Aroon::new(14)`                     | `period + 1`                             | 15                               | 15th                     | `up`, `down`                                           |
| `Kst`             | `Kst::classic()`                     | longest `roc_i + sma_i` + `signal − 1`   | 53                               | 53rd                     | `kst`, `signal`                                        |
| `Alligator`       | `Alligator::new(13, 8, 5)`           | `max(jaw, teeth, lips)`                  | 13                               | 13th                     | `jaw`, `teeth`, `lips`                                 |
| `Keltner`         | `Keltner::new(20, 10, 2.0)`          | `ema_period.max(atr_period)`             | 20                               | 20th                     | `upper`, `middle`, `lower`                             |
| `Donchian`        | `Donchian::new(20)`                  | `period`                                 | 20                               | 20th                     | `upper`, `middle`, `lower`                             |
| `Vortex`          | `Vortex::new(14)`                    | `period + 1`                             | 15                               | 15th                     | `plus`, `minus`                                        |
| `SuperTrend`      | `SuperTrend::new(10, 3.0)`           | `atr_period`                             | 10                               | 10th                     | `value`, `direction`                                   |
| `ChandelierExit`  | `ChandelierExit::new(22, 3.0)`       | `period`                                 | 22                               | 22nd                     | `long_stop`, `short_stop`                              |
| `ChandeKrollStop` | `ChandeKrollStop::new(10, 1.0, 9)`   | `atr_period + stop_period - 1`           | 18                               | 18th                     | `stop_long`, `stop_short`                              |
| `MaEnvelope`      | `MaEnvelope::new(20, 0.025)`         | `period`                                 | 20                               | 20th                     | `upper`, `middle`, `lower`                             |
| `AccelerationBands` | `AccelerationBands::new(20, 0.001)` | `period`                                 | 20                               | 20th                     | `upper`, `middle`, `lower`                             |
| `StarcBands`      | `StarcBands::new(6, 15, 2.0)`        | `max(sma_period, atr_period)`            | 15                               | 15th                     | `upper`, `middle`, `lower`                             |
| `AtrBands`        | `AtrBands::new(14, 3.0)`             | `period`                                 | 14                               | 14th                     | `upper`, `middle`, `lower`                             |
| `HurstChannel`    | `HurstChannel::new(10, 0.5)`         | `period`                                 | 10                               | 10th                     | `upper`, `middle`, `lower`                             |
| `LinRegChannel`   | `LinRegChannel::new(20, 2.0)`        | `period`                                 | 20                               | 20th                     | `upper`, `middle`, `lower`                             |
| `StandardErrorBands` | `StandardErrorBands::new(21, 2.0)` | `period`                                 | 21                               | 21st                     | `upper`, `middle`, `lower`                             |
| `DoubleBollinger` | `DoubleBollinger::new(20, 1.0, 2.0)` | `period`                                 | 20                               | 20th                     | `upper_outer`, `upper_inner`, `middle`, `lower_inner`, `lower_outer` |
| `TtmSqueeze`      | `TtmSqueeze::new(20, 2.0, 1.5)`      | `period`                                 | 20                               | 20th                     | `squeeze`, `momentum`                                  |
| `FractalChaosBands` | `FractalChaosBands::new(2)`         | `2k + 1` + first fractal of each kind    | ≥ 5                              | first bar with both fractals confirmed | `upper`, `lower`                          |
| `VwapStdDevBands` | `VwapStdDevBands::new(2.0)`          | first bar with non-zero volume           | 1                                | 1st                      | `upper`, `middle`, `lower`, `stddev`                   |
| `Rwi`             | `Rwi::new(14)`                       | `period`                                 | 14                               | 14th                     | `high`, `low`                                          |
| `WaveTrend`       | `WaveTrend::classic()`               | `2 * channel + average + signal - 3`     | 42                               | 42nd                     | `wt1`, `wt2`                                           |

## Family 09 — Trailing Stops (added since 0.2.0)

| Indicator                | Constructor                                  | Formula                          | warmup for shown args | Inputs at first emission |
|--------------------------|----------------------------------------------|----------------------------------|----------------------|--------------------------|
| `HiLoActivator`          | `HiLoActivator::new(3)`                      | `period + 1`                     | 4                    | 4th                      |
| `VoltyStop`              | `VoltyStop::classic()` (`14, 2.0`)           | `atr_period + 1`                 | 15                   | 15th                     |
| `YoyoExit`               | `YoyoExit::classic()` (`14, 2.0`)            | `atr_period + 1`                 | 15                   | 15th                     |
| `DonchianStop`           | `DonchianStop::classic()` (`10`)             | `period`                         | 10                   | 10th                     |
| `PercentageTrailingStop` | `PercentageTrailingStop::classic()` (`5.0`)  | constant `1`                     | 1                    | 1st                      |
| `StepTrailingStop`       | `StepTrailingStop::classic()` (`1.0`)        | constant `1`                     | 1                    | 1st                      |
| `RenkoTrailingStop`      | `RenkoTrailingStop::classic()` (`1.0`)       | constant `1`                     | 1                    | 1st                      |
| `SarExt`                 | `SarExt::classic()`                          | constant `2`                     | 2                    | 2nd                      |

## Family 10 — Ehlers / Cycle (DSP)

The Hilbert-chain indicators (Mama / Fama / HilbertDominantCycle / SineWave /
AdaptiveCycle) inherit a long warmup from the truncated-Hilbert phase
extractor — `warmup_period()` reports a conservative ~50.

| Indicator                  | Constructor                                       | Formula                                | warmup | Inputs at first emission |
|----------------------------|---------------------------------------------------|----------------------------------------|--------|--------------------------|
| `Mama`                     | `Mama::classic()` (`0.5, 0.05`)                   | Hilbert-chain warmup                   | ~30    | ~30th                    |
| `Fama`                     | `Fama::classic()` (`0.5, 0.05`)                   | delegates to `Mama`                    | ~30    | ~30th                    |
| `FisherTransform`          | `FisherTransform::new(10)`                        | `period`                               | 10     | 10th                     |
| `InverseFisherTransform`   | `InverseFisherTransform::new(1.0)`                | constant `1`                           | 1      | 1st                      |
| `SuperSmoother`            | `SuperSmoother::new(10)`                          | constant `2` (pass-through warmup)     | 2      | 2nd                      |
| `HilbertDominantCycle`     | `HilbertDominantCycle::new()`                     | Hilbert-chain warmup                   | ~50    | ~50th                    |
| `SineWave`                 | `SineWave::new()`                                 | Hilbert-chain warmup                   | ~50    | ~50th                    |
| `Decycler`                 | `Decycler::new(20)`                               | constant `2`                           | 2      | 2nd                      |
| `DecyclerOscillator`       | `DecyclerOscillator::new(10, 30)`                 | constant `2`                           | 2      | 2nd                      |
| `RoofingFilter`            | `RoofingFilter::new(10, 48)`                      | constant `2`                           | 2      | 2nd                      |
| `CenterOfGravity`          | `CenterOfGravity::new(10)`                        | `period`                               | 10     | 10th                     |
| `CyberneticCycle`          | `CyberneticCycle::new(10)`                        | constant `6`                           | 6      | 6th                      |
| `AdaptiveCycle`            | `AdaptiveCycle::new()`                            | inherits HilbertDominantCycle          | ~50    | ~50th                    |
| `EmpiricalModeDecomposition` | `EmpiricalModeDecomposition::new(20, 0.5)`      | `period`                               | 20     | 20th                     |
| `EhlersStochastic`         | `EhlersStochastic::new(20)`                       | `period` + RoofingFilter warmup        | ~70    | ~70th                    |
| `InstantaneousTrendline`   | `InstantaneousTrendline::new(20)`                 | `period`                               | 20     | 20th                     |
| `HtPhasor`                 | `HtPhasor::new()`                                 | Hilbert-chain warmup                   | 19     | 19th                     |
| `HtDcPhase`                | `HtDcPhase::new()`                                | Hilbert-chain warmup                   | 50     | 50th                     |
| `HtTrendMode`              | `HtTrendMode::new()`                              | Hilbert-chain warmup                   | 50     | 50th                     |

## Family 11 — Pivots & S/R

| Indicator           | Constructor                          | Formula                          | warmup | Inputs at first emission |
|---------------------|--------------------------------------|----------------------------------|--------|--------------------------|
| `ClassicPivots`     | `ClassicPivots::new()`               | constant `1`                     | 1      | 1st                      |
| `FibonacciPivots`   | `FibonacciPivots::new()`             | constant `1`                     | 1      | 1st                      |
| `Camarilla`         | `Camarilla::new()`                   | constant `1`                     | 1      | 1st                      |
| `WoodiePivots`      | `WoodiePivots::new()`                | constant `1`                     | 1      | 1st                      |
| `DemarkPivots`      | `DemarkPivots::new()`                | constant `1`                     | 1      | 1st                      |
| `WilliamsFractals`  | `WilliamsFractals::new()`            | constant `5`                     | 5      | 5th (centre bar at index 3) |
| `ZigZag`            | `ZigZag::new(0.05)`                  | constant `2`                     | 2      | 2nd (only emits on confirmation) |

## Family 12 — DeMark

| Indicator            | Constructor                                  | Formula                                        | warmup | Inputs at first emission |
|----------------------|----------------------------------------------|------------------------------------------------|--------|--------------------------|
| `TdSetup`            | `TdSetup::classic()` (`4, 9`)                | `lookback + 1`                                 | 5      | 5th                      |
| `TdSequential`       | `TdSequential::classic()` (`4, 9, 2, 13`)    | `max(setup_lookback, countdown_lookback) + 1`  | 5      | 5th                      |
| `TdCountdown`        | `TdCountdown::classic()` (`4, 9, 2, 13`)     | `max(setup_lookback, countdown_lookback) + 1`  | 5      | 5th                      |
| `TdCombo`            | `TdCombo::classic()` (`4, 9, 2, 13`)         | `max(setup_lookback, countdown_lookback) + 1`  | 5      | 5th                      |
| `TdLines` (TDST)     | `TdLines::new(4, 9)`                         | `lookback + 1` (NaN until first setup)         | 5      | 5th (level emits later)  |
| `TdDeMarker`         | `TdDeMarker::new(14)`                        | `period + 1`                                   | 15     | 15th                     |
| `TdRei`              | `TdRei::classic()` (`5`)                     | `period + 7`                                   | 12     | 12th                     |
| `TdPressure`         | `TdPressure::new(5)`                         | `period`                                       | 5      | 5th                      |
| `TdRangeProjection`  | `TdRangeProjection::new()`                   | constant `1`                                   | 1      | 1st                      |
| `TdDifferential`     | `TdDifferential::new()`                      | constant `2`                                   | 2      | 2nd                      |
| `TdOpen`             | `TdOpen::new()`                              | constant `2`                                   | 2      | 2nd                      |
| `TdRiskLevel`        | `TdRiskLevel::new(4, 9)`                     | `lookback + 1` (NaN until first setup)         | 5      | 5th (level emits later)  |

## Family 13 — Ichimoku & Charts

| Indicator    | Constructor                          | Formula                                    | warmup | Inputs at first emission |
|--------------|--------------------------------------|--------------------------------------------|--------|--------------------------|
| `Ichimoku`   | `Ichimoku::classic()` (`9, 26, 52, 26`) | `senkou_b_period + displacement - 1`    | 77     | 77th                     |
| `HeikinAshi` | `HeikinAshi::new()`                  | constant `1`                               | 1      | 1st                      |

## Family 14 — Candlestick Patterns

All single-bar patterns warm up in 1; 2-bar patterns in 2; 3-bar patterns
in 3. Pattern-shape only — combine with a trend filter for actionable
signals.

| Indicator              | Constructor                          | Formula      | warmup | Inputs at first emission |
|------------------------|--------------------------------------|--------------|--------|--------------------------|
| `Doji`                 | `Doji::default()`                    | constant `1` | 1      | 1st                      |
| `Hammer`               | `Hammer::new()`                      | constant `1` | 1      | 1st                      |
| `InvertedHammer`       | `InvertedHammer::new()`              | constant `1` | 1      | 1st                      |
| `HangingMan`           | `HangingMan::new()`                  | constant `1` | 1      | 1st                      |
| `ShootingStar`         | `ShootingStar::new()`                | constant `1` | 1      | 1st                      |
| `Marubozu`             | `Marubozu::default()`                | constant `1` | 1      | 1st                      |
| `SpinningTop`          | `SpinningTop::new(0.3)`              | constant `1` | 1      | 1st                      |
| `Engulfing`            | `Engulfing::new()`                   | constant `2` | 2      | 2nd                      |
| `Harami`               | `Harami::new()`                      | constant `2` | 2      | 2nd                      |
| `PiercingDarkCloud`    | `PiercingDarkCloud::new()`           | constant `2` | 2      | 2nd                      |
| `Tweezer`              | `Tweezer::new(0.001)`                | constant `2` | 2      | 2nd                      |
| `MorningEveningStar`   | `MorningEveningStar::new()`          | constant `3` | 3      | 3rd                      |
| `ThreeSoldiersOrCrows` | `ThreeSoldiersOrCrows::new()`        | constant `3` | 3      | 3rd                      |
| `ThreeInside`          | `ThreeInside::new()`                 | constant `3` | 3      | 3rd                      |
| `ThreeOutside`         | `ThreeOutside::new()`                | constant `3` | 3      | 3rd                      |
| `TwoCrows` | `TwoCrows::new()` | constant `3` | 3 | 3rd |
| `UpsideGapTwoCrows` | `UpsideGapTwoCrows::new()` | constant `3` | 3 | 3rd |
| `IdenticalThreeCrows` | `IdenticalThreeCrows::new()` | constant `3` | 3 | 3rd |
| `ThreeLineStrike` | `ThreeLineStrike::new()` | constant `4` | 4 | 4th |
| `ThreeStarsInSouth` | `ThreeStarsInSouth::new()` | constant `3` | 3 | 3rd |
| `AbandonedBaby` | `AbandonedBaby::new()` | constant `3` | 3 | 3rd |
| `AdvanceBlock` | `AdvanceBlock::new()` | constant `3` | 3 | 3rd |
| `BeltHold` | `BeltHold::new()` | constant `1` | 1 | 1st |
| `Breakaway` | `Breakaway::new()` | constant `5` | 5 | 5th |
| `Counterattack` | `Counterattack::new()` | constant `2` | 2 | 2nd |
| `DojiStar` | `DojiStar::new()` | constant `2` | 2 | 2nd |
| `DragonflyDoji` | `DragonflyDoji::new()` | constant `1` | 1 | 1st |
| `GravestoneDoji` | `GravestoneDoji::new()` | constant `1` | 1 | 1st |
| `LongLeggedDoji` | `LongLeggedDoji::new()` | constant `1` | 1 | 1st |
| `RickshawMan` | `RickshawMan::new()` | constant `1` | 1 | 1st |
| `EveningDojiStar` | `EveningDojiStar::new()` | constant `3` | 3 | 3rd |
| `MorningDojiStar` | `MorningDojiStar::new()` | constant `3` | 3 | 3rd |
| `GapSideBySideWhite` | `GapSideBySideWhite::new()` | constant `3` | 3 | 3rd |
| `HighWave` | `HighWave::new()` | constant `1` | 1 | 1st |
| `Hikkake` | `Hikkake::new()` | constant `3` | 3 | 3rd |
| `HikkakeModified` | `HikkakeModified::new()` | constant `3` | 3 | 3rd |
| `HomingPigeon` | `HomingPigeon::new()` | constant `2` | 2 | 2nd |
| `OnNeck` | `OnNeck::new()` | constant `2` | 2 | 2nd |
| `InNeck` | `InNeck::new()` | constant `2` | 2 | 2nd |
| `Thrusting` | `Thrusting::new()` | constant `2` | 2 | 2nd |
| `SeparatingLines` | `SeparatingLines::new()` | constant `2` | 2 | 2nd |
| `Kicking` | `Kicking::new()` | constant `2` | 2 | 2nd |
| `KickingByLength` | `KickingByLength::new()` | constant `2` | 2 | 2nd |
| `LadderBottom` | `LadderBottom::new()` | constant `5` | 5 | 5th |
| `MatHold` | `MatHold::new()` | constant `5` | 5 | 5th |
| `MatchingLow` | `MatchingLow::new()` | constant `2` | 2 | 2nd |
| `LongLine` | `LongLine::new()` | constant `5` | 5 | 5th |
| `ShortLine` | `ShortLine::new()` | constant `5` | 5 | 5th |
| `RisingThreeMethods` | `RisingThreeMethods::new()` | constant `5` | 5 | 5th |
| `FallingThreeMethods` | `FallingThreeMethods::new()` | constant `5` | 5 | 5th |
| `UpsideGapThreeMethods` | `UpsideGapThreeMethods::new()` | constant `3` | 3 | 3rd |
| `DownsideGapThreeMethods` | `DownsideGapThreeMethods::new()` | constant `3` | 3 | 3rd |
| `StalledPattern` | `StalledPattern::new()` | constant `3` | 3 | 3rd |
| `StickSandwich` | `StickSandwich::new()` | constant `3` | 3 | 3rd |
| `Takuri` | `Takuri::new()` | constant `1` | 1 | 1st |
| `ClosingMarubozu` | `ClosingMarubozu::new()` | constant `1` | 1 | 1st |
| `OpeningMarubozu` | `OpeningMarubozu::new()` | constant `1` | 1 | 1st |
| `TasukiGap` | `TasukiGap::new()` | constant `3` | 3 | 3rd |
| `UniqueThreeRiver` | `UniqueThreeRiver::new()` | constant `3` | 3 | 3rd |
| `ConcealingBabySwallow` | `ConcealingBabySwallow::new()` | constant `4` | 4 | 4th |

## Family 15 — Risk / Performance

Some risk metrics take a single `f64` (returns / equity), others take an
`(asset, benchmark)` pair.

| Indicator                  | Constructor                                  | Formula                          | warmup | Inputs at first emission |
|----------------------------|----------------------------------------------|----------------------------------|--------|--------------------------|
| `SharpeRatio`              | `SharpeRatio::new(20, 0.0)`                  | `period`                         | 20     | 20th                     |
| `SortinoRatio`             | `SortinoRatio::new(20, 0.0)`                 | `period`                         | 20     | 20th                     |
| `CalmarRatio`              | `CalmarRatio::new(20)`                       | `period`                         | 20     | 20th                     |
| `OmegaRatio`               | `OmegaRatio::new(20, 0.0)`                   | `period`                         | 20     | 20th                     |
| `MaxDrawdown`              | `MaxDrawdown::new(252)`                      | constant `1`                     | 1      | 1st                      |
| `AverageDrawdown`          | `AverageDrawdown::new(20)`                   | `period`                         | 20     | 20th                     |
| `DrawdownDuration`         | `DrawdownDuration::new()`                    | constant `1`                     | 1      | 1st                      |
| `PainIndex`                | `PainIndex::new(20)`                         | `period`                         | 20     | 20th                     |
| `ValueAtRisk`              | `ValueAtRisk::new(100, 0.95)`                | `period`                         | 100    | 100th                    |
| `ConditionalValueAtRisk`   | `ConditionalValueAtRisk::new(100, 0.95)`     | `period`                         | 100    | 100th                    |
| `ProfitFactor`             | `ProfitFactor::new(20)`                      | `period`                         | 20     | 20th                     |
| `GainLossRatio`            | `GainLossRatio::new(20)`                     | `period`                         | 20     | 20th                     |
| `RecoveryFactor`           | `RecoveryFactor::new()`                      | constant `1`                     | 1      | 1st                      |
| `KellyCriterion`           | `KellyCriterion::new(100)`                   | `period`                         | 100    | 100th                    |
| `TreynorRatio`             | `TreynorRatio::new(50, 0.0)`                 | `period`                         | 50     | 50th                     |
| `InformationRatio`         | `InformationRatio::new(50)`                  | `period`                         | 50     | 50th                     |
| `Alpha`                    | `Alpha::new(50, 0.0)`                        | `period`                         | 50     | 50th                     |

## Family 16 — Market Profile

`InitialBalance` and `OpeningRange` lock after warmup and need a manual `reset()`
at session boundaries; `ValueArea`, `VolumeProfile` and `TpoProfile` are rolling
and evict automatically.

| Indicator         | Constructor                              | Formula      | warmup | Inputs at first emission |
|-------------------|------------------------------------------|--------------|--------|--------------------------|
| `ValueArea`       | `ValueArea::new(20, 50, 0.70)`           | `period`     | 20     | 20th                     |
| `VolumeProfile`   | `VolumeProfile::new(20, 50)`             | `period`     | 20     | 20th                     |
| `TpoProfile`      | `TpoProfile::new(30, 50)`                | `period`     | 30     | 30th                     |
| `InitialBalance`  | `InitialBalance::classic()` (`12`)       | `period`     | 12     | 12th (then locks)         |
| `OpeningRange`    | `OpeningRange::classic()` (`6`)          | `period`     | 6      | 6th (then locks; live `breakout_distance`) |

## Family 17 — Microstructure

Non-OHLCV indicators over the order book and trade tape. Most are stateless or
fixed-window; `Footprint` accumulates until `reset()`.

| Indicator                | Constructor                       | Formula        | warmup | Inputs at first emission |
|--------------------------|-----------------------------------|----------------|--------|--------------------------|
| `OrderBookImbalanceTop1` | `OrderBookImbalanceTop1::new()`   | constant `1`   | 1      | 1st snapshot             |
| `OrderBookImbalanceTopN` | `OrderBookImbalanceTopN::new(5)`  | constant `1`   | 1      | 1st snapshot             |
| `OrderBookImbalanceFull` | `OrderBookImbalanceFull::new()`   | constant `1`   | 1      | 1st snapshot             |
| `Microprice`             | `Microprice::new()`               | constant `1`   | 1      | 1st snapshot             |
| `QuotedSpread`           | `QuotedSpread::new()`             | constant `1`   | 1      | 1st snapshot             |
| `DepthSlope`             | `DepthSlope::new()`               | constant `1`   | 1      | 1st snapshot             |
| `SignedVolume`           | `SignedVolume::new()`             | constant `1`   | 1      | 1st trade                |
| `CumulativeVolumeDelta`  | `CumulativeVolumeDelta::new()`    | constant `1`   | 1      | 1st trade (reset per session) |
| `TradeImbalance`         | `TradeImbalance::new(20)`         | `window`       | 20     | 20th trade               |
| `EffectiveSpread`        | `EffectiveSpread::new()`          | constant `1`   | 1      | 1st trade-quote          |
| `RealizedSpread`         | `RealizedSpread::new(10)`         | `horizon + 1`  | 11     | 11th trade-quote         |
| `KylesLambda`            | `KylesLambda::new(50)`            | `window + 1`   | 51     | 51st trade-quote         |
| `Footprint`              | `Footprint::new(0.5)`             | constant `1`   | 1      | 1st trade (reset per bar) |

## Family 18 — Derivatives

Perpetual- and dated-futures analytics over a `DerivativesTick`. Most are
stateless or fixed-window; `OpenInterestDelta` needs a previous tick and
`OIPriceDivergence` a full `window`-tick lookback.

| Indicator             | Constructor                     | Formula        | warmup | Inputs at first emission |
|-----------------------|---------------------------------|----------------|--------|--------------------------|
| `FundingRate`         | `FundingRate::new()`            | constant `1`   | 1      | 1st tick                 |
| `FundingRateMean`     | `FundingRateMean::new(20)`      | `window`       | 20     | 20th tick                |
| `FundingRateZScore`   | `FundingRateZScore::new(20)`    | `window`       | 20     | 20th tick                |
| `FundingBasis`        | `FundingBasis::new()`           | constant `1`   | 1      | 1st tick                 |
| `OpenInterestDelta`   | `OpenInterestDelta::new()`      | constant `2`   | 2      | 2nd tick                 |
| `OIPriceDivergence`   | `OIPriceDivergence::new(20)`    | `window + 1`   | 21     | 21st tick                |
| `OIWeighted`          | `OIWeighted::new()`             | constant `1`   | 1      | 1st tick                 |
| `LongShortRatio`      | `LongShortRatio::new()`         | constant `1`   | 1      | 1st tick                 |
| `TakerBuySellRatio`   | `TakerBuySellRatio::new()`      | constant `1`   | 1      | 1st tick                 |
| `LiquidationFeatures` | `LiquidationFeatures::new()`    | constant `1`   | 1      | 1st tick                 |
| `TermStructureBasis`  | `TermStructureBasis::new()`     | constant `1`   | 1      | 1st tick                 |
| `CalendarSpread`      | `CalendarSpread::new()`         | constant `1`   | 1      | 1st tick                 |

## Additional Volume indicators

| Indicator                  | Constructor                          | Formula                  | warmup | Inputs at first emission |
|----------------------------|--------------------------------------|--------------------------|--------|--------------------------|
| `AdOscillator`             | `AdOscillator::new()`                | constant `2`             | 2      | 2nd                      |
| `AnchoredVwap`             | `AnchoredVwap::new()`                | `1` post-anchor          | n/a    | 1st bar after `set_anchor()` |
| `Kvo`                      | `Kvo::classic()` (`34, 55, 13`)      | `slow + signal - 1`      | 67     | 67th                     |
| `MarketFacilitationIndex`  | `MarketFacilitationIndex::new()`     | constant `1`             | 1      | 1st                      |
| `Nvi`                      | `Nvi::new()`                         | constant `2`             | 2      | 2nd                      |
| `Pvi`                      | `Pvi::new()`                         | constant `2`             | 2      | 2nd                      |
| `Tsv`                      | `Tsv::new(18)`                       | `period + 1`             | 19     | 19th                     |
| `Vzo`                      | `Vzo::new(14)`                       | `period + 1`             | 15     | 15th                     |
| `VolumeOscillator`         | `VolumeOscillator::new(14, 28)`      | `slow`                   | 28     | 28th                     |
| `DemandIndex`              | `DemandIndex::new(20)`               | `period + 1`             | 21     | 21st                     |

## Additional Price Statistics indicators

| Indicator                  | Constructor                                  | Formula                                              | warmup | Inputs at first emission |
|----------------------------|----------------------------------------------|------------------------------------------------------|--------|--------------------------|
| `Variance`                 | `Variance::new(20)`                          | `period`                                             | 20     | 20th                     |
| `CoefficientOfVariation`   | `CoefficientOfVariation::new(20)`            | `period`                                             | 20     | 20th                     |
| `Skewness`                 | `Skewness::new(20)`                          | `period`                                             | 20     | 20th                     |
| `Kurtosis`                 | `Kurtosis::new(20)`                          | `period`                                             | 20     | 20th                     |
| `StandardError`            | `StandardError::new(20)`                     | `period`                                             | 20     | 20th                     |
| `RSquared`                 | `RSquared::new(20)`                          | `period`                                             | 20     | 20th                     |
| `MedianAbsoluteDeviation`  | `MedianAbsoluteDeviation::new(20)`           | `period`                                             | 20     | 20th                     |
| `Autocorrelation`          | `Autocorrelation::new(50, 1)`                | `period`                                             | 50     | 50th                     |
| `HurstExponent`            | `HurstExponent::new(100, 4)`                 | `period`                                             | 100    | 100th                    |
| `PearsonCorrelation`       | `PearsonCorrelation::new(50)`                | `period`                                             | 50     | 50th                     |
| `Beta`                     | `Beta::new(50)`                              | `period`                                             | 50     | 50th                     |
| `PairwiseBeta`             | `PairwiseBeta::new(50)`                      | `period + 1`                                         | 51     | 51st                     |
| `PairSpreadZScore`         | `PairSpreadZScore::new(30, 20)`              | `beta_period + z_period − 1`                         | 49     | 49th                     |
| `LeadLagCrossCorrelation`  | `LeadLagCrossCorrelation::new(20, 10)`       | `window + 2·max_lag`                                 | 40     | 40th                     |
| `Cointegration`            | `Cointegration::new(30, 1)`                  | `period`                                             | 30     | 30th                     |
| `RelativeStrengthAB`       | `RelativeStrengthAB::new(20, 14)`            | `max(ma_period, rsi_period + 1)`                     | 20     | 20th                     |
| `SpearmanCorrelation`      | `SpearmanCorrelation::new(50)`               | `period`                                             | 50     | 50th                     |
| `DetrendedStdDev`          | `DetrendedStdDev::new(20)`                   | `period`                                             | 20     | 20th                     |
| `AvgPrice`                 | `AvgPrice::new()`                            | constant `1`                                         | 1      | 1st                      |
| `MidPrice`                 | `MidPrice::new(14)`                          | `period`                                             | 14     | 14th                     |
| `MidPoint`                 | `MidPoint::new(14)`                          | `period`                                             | 14     | 14th                     |
| `LinRegIntercept`          | `LinRegIntercept::new(14)`                   | `period`                                             | 14     | 14th                     |
| `Tsf`                      | `Tsf::new(14)`                               | `period`                                             | 14     | 14th                     |

## Additional Price Oscillators

| Indicator                    | Constructor                              | Formula                  | warmup | Inputs at first emission |
|------------------------------|------------------------------------------|--------------------------|--------|--------------------------|
| `Apo`                        | `Apo::new(12, 26)`                       | `slow`                   | 26     | 26th                     |
| `AwesomeOscillatorHistogram` | `AwesomeOscillatorHistogram::new(5, 34)` | `slow + 1`               | 35     | 35th                     |
| `Cfo`                        | `Cfo::new(14)`                           | `period`                 | 14     | 14th                     |
| `ZeroLagMacd`                | `ZeroLagMacd::classic()` (`12, 26, 9`)   | ZLEMA-chain warmup       | 50     | 50th                     |
| `ElderImpulse`               | `ElderImpulse::classic()`                | `slow + signal - 1`      | 34     | 34th                     |
| `Stc`                        | `Stc::classic()` (`23, 50, 10`)          | `slow + cycle + 1`       | 61     | 61st                     |

## "Off-by-one" cases worth memorising

A few indicators look like they should warm up at `period` but in fact need
`period + 1` inputs. The reason is always the same — they consume *diffs*
or *previous-close* differences, not the prices themselves, and the very
first input has nothing to diff against.

- **`Rsi::new(period)` warmup is `period + 1`.** RSI is based on Wilder's
  smoothing over per-tick gains and losses. With 14 prices you only have 13
  diffs; you need 15 prices to compute 14 diffs and seed `avg_gain` /
  `avg_loss`. The Rust unit test that pins this is
  `warmup_period_is_period_plus_one`:
  ```rust
  let rsi = Rsi::new(14).unwrap();
  assert_eq!(rsi.warmup_period(), 15);
  ```
- **`Roc::new(period)` warmup is `period + 1`.** ROC compares the current
  price to the price `period` bars ago; that comparison only makes sense
  starting at input `period + 1`.
- **`Aroon::new(period)` warmup is `period + 1`.** Aroon scans a `period + 1`-bar
  window to find the bars-since-high and bars-since-low.
- **`Kama::new(er_period, ...)` warmup is `er_period + 1`.** Kaufman's
  efficiency ratio needs `er_period` differences, which costs one extra
  bar.

## Cross-checking from your own code

The cleanest way to verify any of these from your application code is the
indicator's own `warmup_period()`:

```rust
use wickra::{Indicator, MacdIndicator};
let macd = MacdIndicator::classic();   // (12, 26, 9)
assert_eq!(macd.warmup_period(), 34);
```

```python
import wickra as ta
assert ta.MACD(12, 26, 9).warmup_period() == 34
```

```javascript
const wickra = require('wickra');
const sma = new wickra.SMA(20);
console.log(sma.warmupPeriod());   // -> 20
```

(Since `wickra@0.2.1`, `warmupPeriod()` is exposed on every Node and
WASM class — single- and multi-output — alongside `update()`, `reset()`
and `isReady()`. Consult `bindings/node/index.d.ts` for the
authoritative TypeScript surface.)

## See also

- [Streaming vs Batch](Streaming-vs-Batch) — the `is_ready()` gate, and
  why a `len(prices) > warmup_period` check is the wrong abstraction.
- [Indicator Chaining](Indicator-Chaining) — how warmups stack inside a
  `Chain`.
- Source: <https://github.com/wickra-lib/wickra>
