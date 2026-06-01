# Wickra

Wickra is a streaming-first technical-indicators library. Every indicator is
implemented in Rust as an O(1) state machine that consumes one input at a
time, and the same engine is exposed through ergonomic bindings for Python,
Node.js, WebAssembly, and Rust itself. The same `update` call you write inside
a live trading loop also drives the historical backtest of that same
strategy — there is no second code path that drifts behind the streaming one.

The project ships 244 indicators across seventeen families — moving averages,
momentum oscillators, trend & directional, price oscillators, volatility &
bands, bands & channels, trailing stops, volume, price statistics, Ehlers /
cycle (DSP), pivots & S/R, DeMark, Ichimoku & charts, candlestick patterns,
market profile, and risk / performance — plus a small set of supporting types
(`Candle`, `Tick`, `Chain`). The Rust core forbids `unsafe`, so every binding
inherits a memory-safe implementation. Install is one command on every
supported platform: `pip install wickra`, `cargo add wickra`, `npm install
wickra` — no system compilers, no C dependencies, no headers.

Wickra is licensed under the **PolyForm Noncommercial 1.0.0** license.
Personal projects, research, hobby trading bots, education, non-profits, and
government use are all permitted; commercial sale of the software or of
services built around it is not. If you want to use Wickra commercially,
open an issue on GitHub to discuss a separate license.

## Published versions

| Registry  | Package        | Version |
|-----------|----------------|---------|
| crates.io | `wickra`       | 0.4.3   |
| crates.io | `wickra-core`  | 0.4.3   |
| crates.io | `wickra-data`  | 0.4.3   |
| PyPI      | `wickra`       | 0.4.3   |
| npm       | `wickra`       | 0.4.3   |
| npm       | `wickra-wasm`  | 0.4.3   |

Release notes and tagged builds:
<https://github.com/wickra-lib/wickra/releases>.

## Wiki contents

- [Quickstart: Python](Quickstart-Python) — `pip install wickra`, a batch
  RSI on a NumPy array, a streaming RSI loop, and the multi-column NaN
  pattern that MACD and friends share.
- [Quickstart: Rust](Quickstart-Rust) — `cargo add wickra`, batch and
  streaming via the `Indicator` and `BatchExt` traits, and the `Chain`
  combinator.
- [Quickstart: Node](Quickstart-Node) — `npm install wickra`, basic
  `SMA` and `MACD` calls, and the install surface.
- [Quickstart: WASM](Quickstart-WASM) — `npm install wickra-wasm`,
  building with `wasm-pack`, and running indicators client-side in a
  browser or bundler.
- [Data Layer](Data-Layer) — the `wickra-data` crate: the CSV reader,
  the tick-to-candle aggregator, the multi-timeframe resampler, and the
  Binance live feed.
- [Streaming vs Batch](Streaming-vs-Batch) — the conceptual difference
  between Wickra's O(1) `update` and the recompute-everything loops in
  batch-only libraries, with the benchmark numbers from the project README.
- [Warmup Periods](Warmup-Periods) — a verified table of every
  indicator's `warmup_period()`, plus the reasoning behind the off-by-one
  cases (RSI(14) needs 15 inputs because it needs 14 diffs).
- [Indicator Chaining](Indicator-Chaining) — `Chain::new(first, second)`
  and `.then(third)`, with a worked EMA(14) → RSI(7) example and the rule
  for stacked warmups.
- [Cookbook](Cookbook) — copy-paste strategy recipes built on streaming
  indicators (RSI mean reversion, MACD crossover, Bollinger breakout,
  ADX-gated trend, multi-timeframe, SuperTrend trailing stop).
- [TA-Lib Migration](TA-Lib-Migration) — function-by-function mapping
  table from TA-Lib's `talib.X(...)` calls to the equivalent Wickra
  expressions.
- [FAQ](FAQ) — quick answers to the most common questions about
  warmup, NaN handling, thread safety, and the streaming-vs-batch contract.

## Indicator reference

Start with [Indicators-Overview](Indicators-Overview) for the full
seventeen-family taxonomy with per-indicator formula / parameter / warmup
tables. The links below are a quick alphabetical-by-family index into the
232 deep-dive pages.

### Moving Averages (19)

[Alligator](Indicator-Alligator) · [Alma](Indicator-Alma) ·
[Dema](Indicator-Dema) · [Ema](Indicator-Ema) ·
[Evwma](Indicator-Evwma) · [Frama](Indicator-Frama) ·
[Hma](Indicator-Hma) · [Jma](Indicator-Jma) ·
[Kama](Indicator-Kama) · [McGinleyDynamic](Indicator-McGinleyDynamic) ·
[Sma](Indicator-Sma) · [Smma](Indicator-Smma) ·
[T3](Indicator-T3) · [Tema](Indicator-Tema) ·
[Trima](Indicator-Trima) · [Vidya](Indicator-Vidya) ·
[Vwma](Indicator-Vwma) · [Wma](Indicator-Wma) ·
[Zlema](Indicator-Zlema)

### Momentum Oscillators (20)

[AwesomeOscillator](Indicator-AwesomeOscillator) · [Cci](Indicator-Cci) ·
[Cmo](Indicator-Cmo) · [ConnorsRsi](Indicator-ConnorsRsi) ·
[Inertia](Indicator-Inertia) · [Kst](Indicator-Kst) ·
[LaguerreRsi](Indicator-LaguerreRsi) · [Mfi](Indicator-Mfi) ·
[Mom](Indicator-Mom) · [Pgo](Indicator-Pgo) ·
[Pmo](Indicator-Pmo) · [Roc](Indicator-Roc) ·
[Rsi](Indicator-Rsi) · [Rvi](Indicator-Rvi) ·
[Smi](Indicator-Smi) · [Stochastic](Indicator-Stochastic) ·
[StochRsi](Indicator-StochRsi) · [Tsi](Indicator-Tsi) ·
[UltimateOscillator](Indicator-UltimateOscillator) ·
[WilliamsR](Indicator-WilliamsR)

### Trend & Directional (13)

[Adx](Indicator-Adx) · [Adxr](Indicator-Adxr) ·
[Aroon](Indicator-Aroon) · [AroonOscillator](Indicator-AroonOscillator) ·
[ChoppinessIndex](Indicator-ChoppinessIndex) ·
[MacdIndicator](Indicator-MacdIndicator) · [MassIndex](Indicator-MassIndex) ·
[Rwi](Indicator-Rwi) · [Tii](Indicator-Tii) ·
[Trix](Indicator-Trix) ·
[VerticalHorizontalFilter](Indicator-VerticalHorizontalFilter) ·
[Vortex](Indicator-Vortex) · [WaveTrend](Indicator-WaveTrend)

### Price Oscillators (11)

[AcceleratorOscillator](Indicator-AcceleratorOscillator) ·
[Apo](Indicator-Apo) ·
[AwesomeOscillatorHistogram](Indicator-AwesomeOscillatorHistogram) ·
[BalanceOfPower](Indicator-BalanceOfPower) · [Cfo](Indicator-Cfo) ·
[Coppock](Indicator-Coppock) · [Dpo](Indicator-Dpo) ·
[ElderImpulse](Indicator-ElderImpulse) · [Ppo](Indicator-Ppo) ·
[Stc](Indicator-Stc) · [ZeroLagMacd](Indicator-ZeroLagMacd)

### Volatility & Bands (18)

[Atr](Indicator-Atr) · [BollingerBands](Indicator-BollingerBands) ·
[BollingerBandwidth](Indicator-BollingerBandwidth) ·
[ChaikinVolatility](Indicator-ChaikinVolatility) ·
[DetrendedStdDev](Indicator-DetrendedStdDev) · [Donchian](Indicator-Donchian) ·
[GarmanKlassVolatility](Indicator-GarmanKlassVolatility) ·
[HistoricalVolatility](Indicator-HistoricalVolatility) ·
[Keltner](Indicator-Keltner) · [Natr](Indicator-Natr) ·
[ParkinsonVolatility](Indicator-ParkinsonVolatility) ·
[PercentB](Indicator-PercentB) ·
[RogersSatchellVolatility](Indicator-RogersSatchellVolatility) ·
[RviVolatility](Indicator-RviVolatility) · [StdDev](Indicator-StdDev) ·
[TrueRange](Indicator-TrueRange) · [UlcerIndex](Indicator-UlcerIndex) ·
[YangZhangVolatility](Indicator-YangZhangVolatility)

### Bands & Channels (11)

[AccelerationBands](Indicator-AccelerationBands) ·
[AtrBands](Indicator-AtrBands) · [DoubleBollinger](Indicator-DoubleBollinger) ·
[FractalChaosBands](Indicator-FractalChaosBands) ·
[HurstChannel](Indicator-HurstChannel) ·
[LinRegChannel](Indicator-LinRegChannel) ·
[MaEnvelope](Indicator-MaEnvelope) ·
[StandardErrorBands](Indicator-StandardErrorBands) ·
[StarcBands](Indicator-StarcBands) · [TtmSqueeze](Indicator-TtmSqueeze) ·
[VwapStdDevBands](Indicator-VwapStdDevBands)

### Trailing Stops (12)

[AtrTrailingStop](Indicator-AtrTrailingStop) ·
[ChandeKrollStop](Indicator-ChandeKrollStop) ·
[ChandelierExit](Indicator-ChandelierExit) ·
[DonchianStop](Indicator-DonchianStop) ·
[HiLoActivator](Indicator-HiLoActivator) ·
[PercentageTrailingStop](Indicator-PercentageTrailingStop) ·
[Psar](Indicator-Psar) ·
[RenkoTrailingStop](Indicator-RenkoTrailingStop) ·
[StepTrailingStop](Indicator-StepTrailingStop) ·
[SuperTrend](Indicator-SuperTrend) · [VoltyStop](Indicator-VoltyStop) ·
[YoyoExit](Indicator-YoyoExit)

### Volume (19)

[AdOscillator](Indicator-AdOscillator) · [Adl](Indicator-Adl) ·
[AnchoredVwap](Indicator-AnchoredVwap) ·
[ChaikinMoneyFlow](Indicator-ChaikinMoneyFlow) ·
[ChaikinOscillator](Indicator-ChaikinOscillator) ·
[DemandIndex](Indicator-DemandIndex) ·
[EaseOfMovement](Indicator-EaseOfMovement) ·
[ForceIndex](Indicator-ForceIndex) · [Kvo](Indicator-Kvo) ·
[MarketFacilitationIndex](Indicator-MarketFacilitationIndex) ·
[Nvi](Indicator-Nvi) · [Obv](Indicator-Obv) ·
[Pvi](Indicator-Pvi) · [RollingVwap](Indicator-RollingVwap) ·
[Tsv](Indicator-Tsv) · [VolumeOscillator](Indicator-VolumeOscillator) ·
[VolumePriceTrend](Indicator-VolumePriceTrend) ·
[Vwap](Indicator-Vwap) · [Vzo](Indicator-Vzo)

### Price Statistics (19)

[Autocorrelation](Indicator-Autocorrelation) · [Beta](Indicator-Beta) ·
[CoefficientOfVariation](Indicator-CoefficientOfVariation) ·
[HurstExponent](Indicator-HurstExponent) · [Kurtosis](Indicator-Kurtosis) ·
[LinearRegression](Indicator-LinearRegression) ·
[LinRegAngle](Indicator-LinRegAngle) · [LinRegSlope](Indicator-LinRegSlope) ·
[MedianAbsoluteDeviation](Indicator-MedianAbsoluteDeviation) ·
[MedianPrice](Indicator-MedianPrice) ·
[PearsonCorrelation](Indicator-PearsonCorrelation) ·
[RSquared](Indicator-RSquared) · [Skewness](Indicator-Skewness) ·
[SpearmanCorrelation](Indicator-SpearmanCorrelation) ·
[StandardError](Indicator-StandardError) ·
[TypicalPrice](Indicator-TypicalPrice) · [Variance](Indicator-Variance) ·
[WeightedClose](Indicator-WeightedClose) · [ZScore](Indicator-ZScore)

### Ehlers / Cycle (DSP) (16)

[AdaptiveCycle](Indicator-AdaptiveCycle) ·
[CenterOfGravity](Indicator-CenterOfGravity) ·
[CyberneticCycle](Indicator-CyberneticCycle) · [Decycler](Indicator-Decycler) ·
[DecyclerOscillator](Indicator-DecyclerOscillator) ·
[EhlersStochastic](Indicator-EhlersStochastic) ·
[EmpiricalModeDecomposition](Indicator-EmpiricalModeDecomposition) ·
[Fama](Indicator-Fama) · [FisherTransform](Indicator-FisherTransform) ·
[HilbertDominantCycle](Indicator-HilbertDominantCycle) ·
[InstantaneousTrendline](Indicator-InstantaneousTrendline) ·
[InverseFisherTransform](Indicator-InverseFisherTransform) ·
[Mama](Indicator-Mama) · [RoofingFilter](Indicator-RoofingFilter) ·
[SineWave](Indicator-SineWave) · [SuperSmoother](Indicator-SuperSmoother)

### Pivots & S/R (7)

[Camarilla](Indicator-Camarilla) · [ClassicPivots](Indicator-ClassicPivots) ·
[DemarkPivots](Indicator-DemarkPivots) ·
[FibonacciPivots](Indicator-FibonacciPivots) ·
[WilliamsFractals](Indicator-WilliamsFractals) ·
[WoodiePivots](Indicator-WoodiePivots) · [ZigZag](Indicator-ZigZag)

### DeMark (12)

[TdCombo](Indicator-TdCombo) · [TdCountdown](Indicator-TdCountdown) ·
[TdDeMarker](Indicator-TdDeMarker) ·
[TdDifferential](Indicator-TdDifferential) · [TdLines](Indicator-TdLines) ·
[TdOpen](Indicator-TdOpen) · [TdPressure](Indicator-TdPressure) ·
[TdRangeProjection](Indicator-TdRangeProjection) · [TdRei](Indicator-TdRei) ·
[TdRiskLevel](Indicator-TdRiskLevel) ·
[TdSequential](Indicator-TdSequential) · [TdSetup](Indicator-TdSetup)

### Ichimoku & Charts (2)

[HeikinAshi](Indicator-HeikinAshi) · [Ichimoku](Indicator-Ichimoku)

### Candlestick Patterns (15)

[Doji](Indicator-Doji) · [Engulfing](Indicator-Engulfing) ·
[Hammer](Indicator-Hammer) · [HangingMan](Indicator-HangingMan) ·
[Harami](Indicator-Harami) · [InvertedHammer](Indicator-InvertedHammer) ·
[Marubozu](Indicator-Marubozu) ·
[MorningEveningStar](Indicator-MorningEveningStar) ·
[PiercingDarkCloud](Indicator-PiercingDarkCloud) ·
[ShootingStar](Indicator-ShootingStar) · [SpinningTop](Indicator-SpinningTop) ·
[ThreeInside](Indicator-ThreeInside) · [ThreeOutside](Indicator-ThreeOutside) ·
[ThreeSoldiersOrCrows](Indicator-ThreeSoldiersOrCrows) ·
[Tweezer](Indicator-Tweezer)

### Market Profile (3)

[InitialBalance](Indicator-InitialBalance) ·
[OpeningRange](Indicator-OpeningRange) · [ValueArea](Indicator-ValueArea)

### Risk / Performance (17)

[Alpha](Indicator-Alpha) · [AverageDrawdown](Indicator-AverageDrawdown) ·
[CalmarRatio](Indicator-CalmarRatio) ·
[ConditionalValueAtRisk](Indicator-ConditionalValueAtRisk) ·
[DrawdownDuration](Indicator-DrawdownDuration) ·
[GainLossRatio](Indicator-GainLossRatio) ·
[InformationRatio](Indicator-InformationRatio) ·
[KellyCriterion](Indicator-KellyCriterion) ·
[MaxDrawdown](Indicator-MaxDrawdown) · [OmegaRatio](Indicator-OmegaRatio) ·
[PainIndex](Indicator-PainIndex) · [ProfitFactor](Indicator-ProfitFactor) ·
[RecoveryFactor](Indicator-RecoveryFactor) ·
[SharpeRatio](Indicator-SharpeRatio) · [SortinoRatio](Indicator-SortinoRatio) ·
[TreynorRatio](Indicator-TreynorRatio) · [ValueAtRisk](Indicator-ValueAtRisk)

### Microstructure (13)

[CumulativeVolumeDelta](Indicator-CumulativeVolumeDelta) ·
[DepthSlope](Indicator-DepthSlope) ·
[EffectiveSpread](Indicator-EffectiveSpread) ·
[Footprint](Indicator-Footprint) · [KylesLambda](Indicator-KylesLambda) ·
[Microprice](Indicator-Microprice) ·
[OrderBookImbalanceFull](Indicator-OrderBookImbalanceFull) ·
[OrderBookImbalanceTop1](Indicator-OrderBookImbalanceTop1) ·
[OrderBookImbalanceTopN](Indicator-OrderBookImbalanceTopN) ·
[QuotedSpread](Indicator-QuotedSpread) ·
[RealizedSpread](Indicator-RealizedSpread) ·
[SignedVolume](Indicator-SignedVolume) ·
[TradeImbalance](Indicator-TradeImbalance)

## See also

- Source code: <https://github.com/wickra-lib/wickra>
- Releases: <https://github.com/wickra-lib/wickra/releases>
- Issue tracker: <https://github.com/wickra-lib/wickra/issues>
