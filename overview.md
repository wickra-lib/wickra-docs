# Wickra

Wickra is a streaming-first technical-indicators library. Every indicator is
implemented in Rust as an O(1) state machine that consumes one input at a
time, and the same engine is exposed through ergonomic bindings for Python,
Node.js, WebAssembly, and Rust itself. The same `update` call you write inside
a live trading loop also drives the historical backtest of that same
strategy — there is no second code path that drifts behind the streaming one.

The project ships 485 indicators across twenty-four families — moving averages,
momentum oscillators, trend & directional, price oscillators, volatility &
bands, bands & channels, trailing stops, volume, price statistics, Ehlers /
cycle (DSP), pivots & S/R, DeMark, Ichimoku & charts, candlestick patterns,
market profile, risk / performance, microstructure, and derivatives — plus a
small set of supporting types
(`Candle`, `Tick`, `Chain`). The Rust core forbids `unsafe`, so every binding
inherits a memory-safe implementation. Install is one command on every
supported platform: `pip install wickra`, `cargo add wickra`, `npm install
wickra` — no system compilers, no C dependencies, no headers.

Wickra is dual-licensed under the **MIT** and **Apache-2.0** licenses; you may
use it under either at your option. It is OSI-approved, permissive open source —
free for any use, commercial or not.

## Published versions

| Registry  | Package        | Version |
|-----------|----------------|---------|
| crates.io | `wickra`       | 0.6.9   |
| crates.io | `wickra-core`  | 0.6.9   |
| crates.io | `wickra-data`  | 0.6.9   |
| PyPI      | `wickra`       | 0.6.9   |
| npm       | `wickra`       | 0.6.9   |
| npm       | `wickra-wasm`  | 0.6.9   |

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
- [Indicator Chaining](/Indicator-Chaining) — `Chain::new(first, second)`
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
twenty-family taxonomy with per-indicator formula / parameter / warmup
tables. The links below are a quick alphabetical-by-family index into the
514 deep-dive pages.

### Moving Averages (26)

[AdaptiveLaguerreFilter](/Indicators/Indicator-AdaptiveLaguerreFilter) · [Alligator](/Indicators/Indicator-Alligator) ·
[Alma](/Indicators/Indicator-Alma) · [Dema](/Indicators/Indicator-Dema) ·
[Ehma](/Indicators/Indicator-Ehma) · [Ema](/Indicators/Indicator-Ema) ·
[Evwma](/Indicators/Indicator-Evwma) · [Frama](/Indicators/Indicator-Frama) ·
[GeneralizedDema](/Indicators/Indicator-GeneralizedDema) · [GeometricMa](/Indicators/Indicator-GeometricMa) ·
[Hma](/Indicators/Indicator-Hma) · [HoltWinters](/Indicators/Indicator-HoltWinters) ·
[Jma](/Indicators/Indicator-Jma) · [Kama](/Indicators/Indicator-Kama) ·
[McGinleyDynamic](/Indicators/Indicator-McGinleyDynamic) · [MedianMa](/Indicators/Indicator-MedianMa) ·
[SineWeightedMa](/Indicators/Indicator-SineWeightedMa) · [Sma](/Indicators/Indicator-Sma) ·
[Smma](/Indicators/Indicator-Smma) · [T3](/Indicators/Indicator-T3) ·
[Tema](/Indicators/Indicator-Tema) · [Trima](/Indicators/Indicator-Trima) ·
[Vidya](/Indicators/Indicator-Vidya) · [Vwma](/Indicators/Indicator-Vwma) ·
[Wma](/Indicators/Indicator-Wma) · [Zlema](/Indicators/Indicator-Zlema)

### Momentum Oscillators (33)

[AnchoredRsi](/Indicators/Indicator-AnchoredRsi) · [AwesomeOscillator](/Indicators/Indicator-AwesomeOscillator) ·
[Cci](/Indicators/Indicator-Cci) · [Cmo](/Indicators/Indicator-Cmo) ·
[ConnorsRsi](/Indicators/Indicator-ConnorsRsi) · [DerivativeOscillator](/Indicators/Indicator-DerivativeOscillator) ·
[DisparityIndex](/Indicators/Indicator-DisparityIndex) · [DynamicMomentumIndex](/Indicators/Indicator-DynamicMomentumIndex) ·
[ElderRay](/Indicators/Indicator-ElderRay) · [FisherRsi](/Indicators/Indicator-FisherRsi) ·
[Inertia](/Indicators/Indicator-Inertia) · [IntradayMomentumIndex](/Indicators/Indicator-IntradayMomentumIndex) ·
[Kst](/Indicators/Indicator-Kst) · [LaguerreRsi](/Indicators/Indicator-LaguerreRsi) ·
[Mfi](/Indicators/Indicator-Mfi) · [Mom](/Indicators/Indicator-Mom) ·
[Pmo](/Indicators/Indicator-Pmo) · [Qqe](/Indicators/Indicator-Qqe) ·
[Rmi](/Indicators/Indicator-Rmi) · [Roc](/Indicators/Indicator-Roc) ·
[Rocp](/Indicators/Indicator-Rocp) · [Rocr](/Indicators/Indicator-Rocr) ·
[Rocr100](/Indicators/Indicator-Rocr100) · [Rsi](/Indicators/Indicator-Rsi) ·
[Rsx](/Indicators/Indicator-Rsx) · [Rvi](/Indicators/Indicator-Rvi) ·
[Smi](/Indicators/Indicator-Smi) · [Stochastic](/Indicators/Indicator-Stochastic) ·
[StochasticCci](/Indicators/Indicator-StochasticCci) · [StochRsi](/Indicators/Indicator-StochRsi) ·
[Tsi](/Indicators/Indicator-Tsi) · [UltimateOscillator](/Indicators/Indicator-UltimateOscillator) ·
[WilliamsR](/Indicators/Indicator-WilliamsR)

### Trend & Directional (28)

[Adx](/Indicators/Indicator-Adx) · [Adxr](/Indicators/Indicator-Adxr) ·
[Aroon](/Indicators/Indicator-Aroon) · [AroonOscillator](/Indicators/Indicator-AroonOscillator) ·
[ChoppinessIndex](/Indicators/Indicator-ChoppinessIndex) · [Dx](/Indicators/Indicator-Dx) ·
[GatorOscillator](/Indicators/Indicator-GatorOscillator) · [KasePermissionStochastic](/Indicators/Indicator-KasePermissionStochastic) ·
[MacdExt](/Indicators/Indicator-MacdExt) · [MacdFix](/Indicators/Indicator-MacdFix) ·
[MacdIndicator](/Indicators/Indicator-MacdIndicator) · [MassIndex](/Indicators/Indicator-MassIndex) ·
[MinusDi](/Indicators/Indicator-MinusDi) · [MinusDm](/Indicators/Indicator-MinusDm) ·
[PlusDi](/Indicators/Indicator-PlusDi) · [PlusDm](/Indicators/Indicator-PlusDm) ·
[PolarizedFractalEfficiency](/Indicators/Indicator-PolarizedFractalEfficiency) · [Qstick](/Indicators/Indicator-Qstick) ·
[Rwi](/Indicators/Indicator-Rwi) · [Tii](/Indicators/Indicator-Tii) ·
[TrendLabel](/Indicators/Indicator-TrendLabel) · [TrendStrengthIndex](/Indicators/Indicator-TrendStrengthIndex) ·
[Trix](/Indicators/Indicator-Trix) · [TtmTrend](/Indicators/Indicator-TtmTrend) ·
[VerticalHorizontalFilter](/Indicators/Indicator-VerticalHorizontalFilter) · [Vortex](/Indicators/Indicator-Vortex) ·
[WavePm](/Indicators/Indicator-WavePm) · [WaveTrend](/Indicators/Indicator-WaveTrend)

### Price Oscillators (15)

[AcceleratorOscillator](/Indicators/Indicator-AcceleratorOscillator) · [Apo](/Indicators/Indicator-Apo) ·
[AwesomeOscillatorHistogram](/Indicators/Indicator-AwesomeOscillatorHistogram) · [BalanceOfPower](/Indicators/Indicator-BalanceOfPower) ·
[Cfo](/Indicators/Indicator-Cfo) · [Coppock](/Indicators/Indicator-Coppock) ·
[Dpo](/Indicators/Indicator-Dpo) · [ElderImpulse](/Indicators/Indicator-ElderImpulse) ·
[MacdHistogram](/Indicators/Indicator-MacdHistogram) · [Pgo](/Indicators/Indicator-Pgo) ·
[Ppo](/Indicators/Indicator-Ppo) · [PpoHistogram](/Indicators/Indicator-PpoHistogram) ·
[Stc](/Indicators/Indicator-Stc) · [TsfOscillator](/Indicators/Indicator-TsfOscillator) ·
[ZeroLagMacd](/Indicators/Indicator-ZeroLagMacd)

### Volatility & Bands (26)

[Atr](/Indicators/Indicator-Atr) · [BipowerVariation](/Indicators/Indicator-BipowerVariation) ·
[BollingerBands](/Indicators/Indicator-BollingerBands) · [BollingerBandwidth](/Indicators/Indicator-BollingerBandwidth) ·
[ChaikinVolatility](/Indicators/Indicator-ChaikinVolatility) · [DetrendedStdDev](/Indicators/Indicator-DetrendedStdDev) ·
[Donchian](/Indicators/Indicator-Donchian) · [EwmaVolatility](/Indicators/Indicator-EwmaVolatility) ·
[Garch11](/Indicators/Indicator-Garch11) · [GarmanKlassVolatility](/Indicators/Indicator-GarmanKlassVolatility) ·
[HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) · [JumpIndicator](/Indicators/Indicator-JumpIndicator) ·
[Keltner](/Indicators/Indicator-Keltner) · [Natr](/Indicators/Indicator-Natr) ·
[ParkinsonVolatility](/Indicators/Indicator-ParkinsonVolatility) · [PercentB](/Indicators/Indicator-PercentB) ·
[RegimeLabel](/Indicators/Indicator-RegimeLabel) · [RogersSatchellVolatility](/Indicators/Indicator-RogersSatchellVolatility) ·
[RviVolatility](/Indicators/Indicator-RviVolatility) · [StdDev](/Indicators/Indicator-StdDev) ·
[TrueRange](/Indicators/Indicator-TrueRange) · [UlcerIndex](/Indicators/Indicator-UlcerIndex) ·
[VolatilityCone](/Indicators/Indicator-VolatilityCone) · [VolatilityOfVolatility](/Indicators/Indicator-VolatilityOfVolatility) ·
[VolatilityRatio](/Indicators/Indicator-VolatilityRatio) · [YangZhangVolatility](/Indicators/Indicator-YangZhangVolatility)

### Bands & Channels (16)

[AccelerationBands](/Indicators/Indicator-AccelerationBands) · [AtrBands](/Indicators/Indicator-AtrBands) ·
[BomarBands](/Indicators/Indicator-BomarBands) · [DoubleBollinger](/Indicators/Indicator-DoubleBollinger) ·
[FractalChaosBands](/Indicators/Indicator-FractalChaosBands) · [HurstChannel](/Indicators/Indicator-HurstChannel) ·
[LinRegChannel](/Indicators/Indicator-LinRegChannel) · [MaEnvelope](/Indicators/Indicator-MaEnvelope) ·
[MedianChannel](/Indicators/Indicator-MedianChannel) · [ProjectionBands](/Indicators/Indicator-ProjectionBands) ·
[ProjectionOscillator](/Indicators/Indicator-ProjectionOscillator) · [QuartileBands](/Indicators/Indicator-QuartileBands) ·
[StandardErrorBands](/Indicators/Indicator-StandardErrorBands) · [StarcBands](/Indicators/Indicator-StarcBands) ·
[TtmSqueeze](/Indicators/Indicator-TtmSqueeze) · [VwapStdDevBands](/Indicators/Indicator-VwapStdDevBands)

### Trailing Stops (19)

[AtrRatchet](/Indicators/Indicator-AtrRatchet) · [AtrTrailingStop](/Indicators/Indicator-AtrTrailingStop) ·
[ChandeKrollStop](/Indicators/Indicator-ChandeKrollStop) · [ChandelierExit](/Indicators/Indicator-ChandelierExit) ·
[DonchianStop](/Indicators/Indicator-DonchianStop) · [ElderSafeZone](/Indicators/Indicator-ElderSafeZone) ·
[HiLoActivator](/Indicators/Indicator-HiLoActivator) · [KaseDevStop](/Indicators/Indicator-KaseDevStop) ·
[ModifiedMaStop](/Indicators/Indicator-ModifiedMaStop) · [Nrtr](/Indicators/Indicator-Nrtr) ·
[PercentageTrailingStop](/Indicators/Indicator-PercentageTrailingStop) · [Psar](/Indicators/Indicator-Psar) ·
[RenkoTrailingStop](/Indicators/Indicator-RenkoTrailingStop) · [SarExt](/Indicators/Indicator-SarExt) ·
[StepTrailingStop](/Indicators/Indicator-StepTrailingStop) · [SuperTrend](/Indicators/Indicator-SuperTrend) ·
[TimeBasedStop](/Indicators/Indicator-TimeBasedStop) · [VoltyStop](/Indicators/Indicator-VoltyStop) ·
[YoyoExit](/Indicators/Indicator-YoyoExit)

### Volume (26)

[Adl](/Indicators/Indicator-Adl) · [AdOscillator](/Indicators/Indicator-AdOscillator) ·
[AnchoredVwap](/Indicators/Indicator-AnchoredVwap) · [BetterVolume](/Indicators/Indicator-BetterVolume) ·
[ChaikinMoneyFlow](/Indicators/Indicator-ChaikinMoneyFlow) · [ChaikinOscillator](/Indicators/Indicator-ChaikinOscillator) ·
[DemandIndex](/Indicators/Indicator-DemandIndex) · [EaseOfMovement](/Indicators/Indicator-EaseOfMovement) ·
[ForceIndex](/Indicators/Indicator-ForceIndex) · [IntradayIntensity](/Indicators/Indicator-IntradayIntensity) ·
[Kvo](/Indicators/Indicator-Kvo) · [MarketFacilitationIndex](/Indicators/Indicator-MarketFacilitationIndex) ·
[Nvi](/Indicators/Indicator-Nvi) · [Obv](/Indicators/Indicator-Obv) ·
[Pvi](/Indicators/Indicator-Pvi) · [RollingVwap](/Indicators/Indicator-RollingVwap) ·
[TradeVolumeIndex](/Indicators/Indicator-TradeVolumeIndex) · [Tsv](/Indicators/Indicator-Tsv) ·
[TwiggsMoneyFlow](/Indicators/Indicator-TwiggsMoneyFlow) · [VolumeOscillator](/Indicators/Indicator-VolumeOscillator) ·
[VolumePriceTrend](/Indicators/Indicator-VolumePriceTrend) · [VolumeRsi](/Indicators/Indicator-VolumeRsi) ·
[VolumeWeightedMacd](/Indicators/Indicator-VolumeWeightedMacd) · [Vwap](/Indicators/Indicator-Vwap) ·
[Vzo](/Indicators/Indicator-Vzo) · [WilliamsAd](/Indicators/Indicator-WilliamsAd)

### Price Statistics (54)

[Autocorrelation](/Indicators/Indicator-Autocorrelation) · [AvgPrice](/Indicators/Indicator-AvgPrice) ·
[Beta](/Indicators/Indicator-Beta) · [BetaNeutralSpread](/Indicators/Indicator-BetaNeutralSpread) ·
[BodySizePct](/Indicators/Indicator-BodySizePct) · [CloseVsOpen](/Indicators/Indicator-CloseVsOpen) ·
[CoefficientOfVariation](/Indicators/Indicator-CoefficientOfVariation) · [Cointegration](/Indicators/Indicator-Cointegration) ·
[DistanceSsd](/Indicators/Indicator-DistanceSsd) · [GrangerCausality](/Indicators/Indicator-GrangerCausality) ·
[HighLowRange](/Indicators/Indicator-HighLowRange) · [HurstExponent](/Indicators/Indicator-HurstExponent) ·
[JarqueBera](/Indicators/Indicator-JarqueBera) · [KalmanHedgeRatio](/Indicators/Indicator-KalmanHedgeRatio) ·
[KendallTau](/Indicators/Indicator-KendallTau) · [Kurtosis](/Indicators/Indicator-Kurtosis) ·
[LeadLagCrossCorrelation](/Indicators/Indicator-LeadLagCrossCorrelation) · [LinearRegression](/Indicators/Indicator-LinearRegression) ·
[LinRegAngle](/Indicators/Indicator-LinRegAngle) · [LinRegIntercept](/Indicators/Indicator-LinRegIntercept) ·
[LinRegSlope](/Indicators/Indicator-LinRegSlope) · [LogReturn](/Indicators/Indicator-LogReturn) ·
[MedianAbsoluteDeviation](/Indicators/Indicator-MedianAbsoluteDeviation) · [MedianPrice](/Indicators/Indicator-MedianPrice) ·
[MidPoint](/Indicators/Indicator-MidPoint) · [MidPrice](/Indicators/Indicator-MidPrice) ·
[OuHalfLife](/Indicators/Indicator-OuHalfLife) · [PairSpreadZScore](/Indicators/Indicator-PairSpreadZScore) ·
[PairwiseBeta](/Indicators/Indicator-PairwiseBeta) · [PearsonCorrelation](/Indicators/Indicator-PearsonCorrelation) ·
[RealizedVolatility](/Indicators/Indicator-RealizedVolatility) · [RelativeStrengthAB](/Indicators/Indicator-RelativeStrengthAB) ·
[RollingCorrelation](/Indicators/Indicator-RollingCorrelation) · [RollingCovariance](/Indicators/Indicator-RollingCovariance) ·
[RollingIqr](/Indicators/Indicator-RollingIqr) · [RollingMinMaxScaler](/Indicators/Indicator-RollingMinMaxScaler) ·
[RollingPercentileRank](/Indicators/Indicator-RollingPercentileRank) · [RollingQuantile](/Indicators/Indicator-RollingQuantile) ·
[RSquared](/Indicators/Indicator-RSquared) · [SampleEntropy](/Indicators/Indicator-SampleEntropy) ·
[ShannonEntropy](/Indicators/Indicator-ShannonEntropy) · [Skewness](/Indicators/Indicator-Skewness) ·
[SpearmanCorrelation](/Indicators/Indicator-SpearmanCorrelation) · [SpreadAr1Coefficient](/Indicators/Indicator-SpreadAr1Coefficient) ·
[SpreadBollingerBands](/Indicators/Indicator-SpreadBollingerBands) · [SpreadHurst](/Indicators/Indicator-SpreadHurst) ·
[StandardError](/Indicators/Indicator-StandardError) · [Tsf](/Indicators/Indicator-Tsf) ·
[TypicalPrice](/Indicators/Indicator-TypicalPrice) · [Variance](/Indicators/Indicator-Variance) ·
[VarianceRatio](/Indicators/Indicator-VarianceRatio) · [WeightedClose](/Indicators/Indicator-WeightedClose) ·
[WickRatio](/Indicators/Indicator-WickRatio) · [ZScore](/Indicators/Indicator-ZScore)

### Ehlers / Cycle (DSP) (29)

[AdaptiveCci](/Indicators/Indicator-AdaptiveCci) · [AdaptiveCycle](/Indicators/Indicator-AdaptiveCycle) ·
[AdaptiveRsi](/Indicators/Indicator-AdaptiveRsi) · [AutocorrelationPeriodogram](/Indicators/Indicator-AutocorrelationPeriodogram) ·
[BandpassFilter](/Indicators/Indicator-BandpassFilter) · [CenterOfGravity](/Indicators/Indicator-CenterOfGravity) ·
[CorrelationTrendIndicator](/Indicators/Indicator-CorrelationTrendIndicator) · [CyberneticCycle](/Indicators/Indicator-CyberneticCycle) ·
[Decycler](/Indicators/Indicator-Decycler) · [DecyclerOscillator](/Indicators/Indicator-DecyclerOscillator) ·
[EhlersStochastic](/Indicators/Indicator-EhlersStochastic) · [EmpiricalModeDecomposition](/Indicators/Indicator-EmpiricalModeDecomposition) ·
[EvenBetterSinewave](/Indicators/Indicator-EvenBetterSinewave) · [Fama](/Indicators/Indicator-Fama) ·
[FisherTransform](/Indicators/Indicator-FisherTransform) · [HighpassFilter](/Indicators/Indicator-HighpassFilter) ·
[HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) · [HtDcPhase](/Indicators/Indicator-HtDcPhase) ·
[HtPhasor](/Indicators/Indicator-HtPhasor) · [HtTrendMode](/Indicators/Indicator-HtTrendMode) ·
[InstantaneousTrendline](/Indicators/Indicator-InstantaneousTrendline) · [InverseFisherTransform](/Indicators/Indicator-InverseFisherTransform) ·
[Mama](/Indicators/Indicator-Mama) · [Reflex](/Indicators/Indicator-Reflex) ·
[RoofingFilter](/Indicators/Indicator-RoofingFilter) · [SineWave](/Indicators/Indicator-SineWave) ·
[SuperSmoother](/Indicators/Indicator-SuperSmoother) · [Trendflex](/Indicators/Indicator-Trendflex) ·
[UniversalOscillator](/Indicators/Indicator-UniversalOscillator)

### Pivots & S/R (12)

[AndrewsPitchfork](/Indicators/Indicator-AndrewsPitchfork) · [Camarilla](/Indicators/Indicator-Camarilla) ·
[CentralPivotRange](/Indicators/Indicator-CentralPivotRange) · [ClassicPivots](/Indicators/Indicator-ClassicPivots) ·
[DemarkPivots](/Indicators/Indicator-DemarkPivots) · [FibonacciPivots](/Indicators/Indicator-FibonacciPivots) ·
[MurreyMathLines](/Indicators/Indicator-MurreyMathLines) · [PivotReversal](/Indicators/Indicator-PivotReversal) ·
[VolumeWeightedSr](/Indicators/Indicator-VolumeWeightedSr) · [WilliamsFractals](/Indicators/Indicator-WilliamsFractals) ·
[WoodiePivots](/Indicators/Indicator-WoodiePivots) · [ZigZag](/Indicators/Indicator-ZigZag)

### DeMark (19)

[TdCamouflage](/Indicators/Indicator-TdCamouflage) · [TdClop](/Indicators/Indicator-TdClop) ·
[TdClopwin](/Indicators/Indicator-TdClopwin) · [TdCombo](/Indicators/Indicator-TdCombo) ·
[TdCountdown](/Indicators/Indicator-TdCountdown) · [TdDeMarker](/Indicators/Indicator-TdDeMarker) ·
[TdDifferential](/Indicators/Indicator-TdDifferential) · [TdDWave](/Indicators/Indicator-TdDWave) ·
[TdLines](/Indicators/Indicator-TdLines) · [TdMovingAverage](/Indicators/Indicator-TdMovingAverage) ·
[TdOpen](/Indicators/Indicator-TdOpen) · [TdPressure](/Indicators/Indicator-TdPressure) ·
[TdPropulsion](/Indicators/Indicator-TdPropulsion) · [TdRangeProjection](/Indicators/Indicator-TdRangeProjection) ·
[TdRei](/Indicators/Indicator-TdRei) · [TdRiskLevel](/Indicators/Indicator-TdRiskLevel) ·
[TdSequential](/Indicators/Indicator-TdSequential) · [TdSetup](/Indicators/Indicator-TdSetup) ·
[TdTrap](/Indicators/Indicator-TdTrap)

### Ichimoku & Charts (7)

[CandleVolume](/Indicators/Indicator-CandleVolume) · [Equivolume](/Indicators/Indicator-Equivolume) ·
[HeikinAshi](/Indicators/Indicator-HeikinAshi) · [HeikinAshiOscillator](/Indicators/Indicator-HeikinAshiOscillator) ·
[Ichimoku](/Indicators/Indicator-Ichimoku) · [SmoothedHeikinAshi](/Indicators/Indicator-SmoothedHeikinAshi) ·
[ThreeLineBreak](/Indicators/Indicator-ThreeLineBreak)

### Candlestick Patterns (66)

[AbandonedBaby](/Indicators/Indicator-AbandonedBaby) · [AdvanceBlock](/Indicators/Indicator-AdvanceBlock) ·
[BeltHold](/Indicators/Indicator-BeltHold) · [Breakaway](/Indicators/Indicator-Breakaway) ·
[ClosingMarubozu](/Indicators/Indicator-ClosingMarubozu) · [ConcealingBabySwallow](/Indicators/Indicator-ConcealingBabySwallow) ·
[Counterattack](/Indicators/Indicator-Counterattack) · [Doji](/Indicators/Indicator-Doji) ·
[DojiStar](/Indicators/Indicator-DojiStar) · [DownsideGapThreeMethods](/Indicators/Indicator-DownsideGapThreeMethods) ·
[DragonflyDoji](/Indicators/Indicator-DragonflyDoji) · [DumplingTop](/Indicators/Indicator-DumplingTop) ·
[Engulfing](/Indicators/Indicator-Engulfing) · [EveningDojiStar](/Indicators/Indicator-EveningDojiStar) ·
[FallingThreeMethods](/Indicators/Indicator-FallingThreeMethods) · [FryPanBottom](/Indicators/Indicator-FryPanBottom) ·
[GapSideBySideWhite](/Indicators/Indicator-GapSideBySideWhite) · [GravestoneDoji](/Indicators/Indicator-GravestoneDoji) ·
[Hammer](/Indicators/Indicator-Hammer) · [HangingMan](/Indicators/Indicator-HangingMan) ·
[Harami](/Indicators/Indicator-Harami) · [HaramiCross](/Indicators/Indicator-HaramiCross) ·
[HighWave](/Indicators/Indicator-HighWave) · [Hikkake](/Indicators/Indicator-Hikkake) ·
[HikkakeModified](/Indicators/Indicator-HikkakeModified) · [HomingPigeon](/Indicators/Indicator-HomingPigeon) ·
[IdenticalThreeCrows](/Indicators/Indicator-IdenticalThreeCrows) · [InNeck](/Indicators/Indicator-InNeck) ·
[InvertedHammer](/Indicators/Indicator-InvertedHammer) · [Kicking](/Indicators/Indicator-Kicking) ·
[KickingByLength](/Indicators/Indicator-KickingByLength) · [LadderBottom](/Indicators/Indicator-LadderBottom) ·
[LongLeggedDoji](/Indicators/Indicator-LongLeggedDoji) · [LongLine](/Indicators/Indicator-LongLine) ·
[Marubozu](/Indicators/Indicator-Marubozu) · [MatchingLow](/Indicators/Indicator-MatchingLow) ·
[MatHold](/Indicators/Indicator-MatHold) · [MorningDojiStar](/Indicators/Indicator-MorningDojiStar) ·
[MorningEveningStar](/Indicators/Indicator-MorningEveningStar) · [NewPriceLines](/Indicators/Indicator-NewPriceLines) ·
[OnNeck](/Indicators/Indicator-OnNeck) · [OpeningMarubozu](/Indicators/Indicator-OpeningMarubozu) ·
[PiercingDarkCloud](/Indicators/Indicator-PiercingDarkCloud) · [RickshawMan](/Indicators/Indicator-RickshawMan) ·
[RisingThreeMethods](/Indicators/Indicator-RisingThreeMethods) · [SeparatingLines](/Indicators/Indicator-SeparatingLines) ·
[ShootingStar](/Indicators/Indicator-ShootingStar) · [ShortLine](/Indicators/Indicator-ShortLine) ·
[SpinningTop](/Indicators/Indicator-SpinningTop) · [StalledPattern](/Indicators/Indicator-StalledPattern) ·
[StickSandwich](/Indicators/Indicator-StickSandwich) · [Takuri](/Indicators/Indicator-Takuri) ·
[TasukiGap](/Indicators/Indicator-TasukiGap) · [ThreeInside](/Indicators/Indicator-ThreeInside) ·
[ThreeLineStrike](/Indicators/Indicator-ThreeLineStrike) · [ThreeOutside](/Indicators/Indicator-ThreeOutside) ·
[ThreeSoldiersOrCrows](/Indicators/Indicator-ThreeSoldiersOrCrows) · [ThreeStarsInSouth](/Indicators/Indicator-ThreeStarsInSouth) ·
[Thrusting](/Indicators/Indicator-Thrusting) · [TowerTopBottom](/Indicators/Indicator-TowerTopBottom) ·
[Tristar](/Indicators/Indicator-Tristar) · [Tweezer](/Indicators/Indicator-Tweezer) ·
[TwoCrows](/Indicators/Indicator-TwoCrows) · [UniqueThreeRiver](/Indicators/Indicator-UniqueThreeRiver) ·
[UpsideGapThreeMethods](/Indicators/Indicator-UpsideGapThreeMethods) · [UpsideGapTwoCrows](/Indicators/Indicator-UpsideGapTwoCrows)

### Market Profile (10)

[CompositeProfile](/Indicators/Indicator-CompositeProfile) · [HighLowVolumeNodes](/Indicators/Indicator-HighLowVolumeNodes) ·
[InitialBalance](/Indicators/Indicator-InitialBalance) · [NakedPoc](/Indicators/Indicator-NakedPoc) ·
[OpeningRange](/Indicators/Indicator-OpeningRange) · [ProfileShape](/Indicators/Indicator-ProfileShape) ·
[SinglePrints](/Indicators/Indicator-SinglePrints) · [TpoProfile](/Indicators/Indicator-TpoProfile) ·
[ValueArea](/Indicators/Indicator-ValueArea) · [VolumeProfile](/Indicators/Indicator-VolumeProfile)

### Risk / Performance (28)

[Alpha](/Indicators/Indicator-Alpha) · [AverageDrawdown](/Indicators/Indicator-AverageDrawdown) ·
[BurkeRatio](/Indicators/Indicator-BurkeRatio) · [CalmarRatio](/Indicators/Indicator-CalmarRatio) ·
[CommonSenseRatio](/Indicators/Indicator-CommonSenseRatio) · [ConditionalValueAtRisk](/Indicators/Indicator-ConditionalValueAtRisk) ·
[DrawdownDuration](/Indicators/Indicator-DrawdownDuration) · [Expectancy](/Indicators/Indicator-Expectancy) ·
[GainLossRatio](/Indicators/Indicator-GainLossRatio) · [GainToPainRatio](/Indicators/Indicator-GainToPainRatio) ·
[InformationRatio](/Indicators/Indicator-InformationRatio) · [KellyCriterion](/Indicators/Indicator-KellyCriterion) ·
[KRatio](/Indicators/Indicator-KRatio) · [M2Measure](/Indicators/Indicator-M2Measure) ·
[MartinRatio](/Indicators/Indicator-MartinRatio) · [MaxDrawdown](/Indicators/Indicator-MaxDrawdown) ·
[OmegaRatio](/Indicators/Indicator-OmegaRatio) · [PainIndex](/Indicators/Indicator-PainIndex) ·
[ProfitFactor](/Indicators/Indicator-ProfitFactor) · [RecoveryFactor](/Indicators/Indicator-RecoveryFactor) ·
[SharpeRatio](/Indicators/Indicator-SharpeRatio) · [SortinoRatio](/Indicators/Indicator-SortinoRatio) ·
[SterlingRatio](/Indicators/Indicator-SterlingRatio) · [TailRatio](/Indicators/Indicator-TailRatio) ·
[TreynorRatio](/Indicators/Indicator-TreynorRatio) · [UpsidePotentialRatio](/Indicators/Indicator-UpsidePotentialRatio) ·
[ValueAtRisk](/Indicators/Indicator-ValueAtRisk) · [WinRate](/Indicators/Indicator-WinRate)

### Microstructure (20)

[AmihudIlliquidity](/Indicators/Indicator-AmihudIlliquidity) · [CumulativeVolumeDelta](/Indicators/Indicator-CumulativeVolumeDelta) ·
[DepthSlope](/Indicators/Indicator-DepthSlope) · [EffectiveSpread](/Indicators/Indicator-EffectiveSpread) ·
[Footprint](/Indicators/Indicator-Footprint) · [HasbrouckInformationShare](/Indicators/Indicator-HasbrouckInformationShare) ·
[KylesLambda](/Indicators/Indicator-KylesLambda) · [Microprice](/Indicators/Indicator-Microprice) ·
[OrderBookImbalanceFull](/Indicators/Indicator-OrderBookImbalanceFull) · [OrderBookImbalanceTop1](/Indicators/Indicator-OrderBookImbalanceTop1) ·
[OrderBookImbalanceTopN](/Indicators/Indicator-OrderBookImbalanceTopN) · [OrderFlowImbalance](/Indicators/Indicator-OrderFlowImbalance) ·
[Pin](/Indicators/Indicator-Pin) · [QuotedSpread](/Indicators/Indicator-QuotedSpread) ·
[RealizedSpread](/Indicators/Indicator-RealizedSpread) · [RollMeasure](/Indicators/Indicator-RollMeasure) ·
[SignedVolume](/Indicators/Indicator-SignedVolume) · [TradeImbalance](/Indicators/Indicator-TradeImbalance) ·
[TradeSignAutocorrelation](/Indicators/Indicator-TradeSignAutocorrelation) · [Vpin](/Indicators/Indicator-Vpin)

### Derivatives (17)

[CalendarSpread](/Indicators/Indicator-CalendarSpread) · [EstimatedLeverageRatio](/Indicators/Indicator-EstimatedLeverageRatio) ·
[FundingBasis](/Indicators/Indicator-FundingBasis) · [FundingImpliedApr](/Indicators/Indicator-FundingImpliedApr) ·
[FundingRate](/Indicators/Indicator-FundingRate) · [FundingRateMean](/Indicators/Indicator-FundingRateMean) ·
[FundingRateZScore](/Indicators/Indicator-FundingRateZScore) · [LiquidationFeatures](/Indicators/Indicator-LiquidationFeatures) ·
[LongShortRatio](/Indicators/Indicator-LongShortRatio) · [OIPriceDivergence](/Indicators/Indicator-OIPriceDivergence) ·
[OiToVolumeRatio](/Indicators/Indicator-OiToVolumeRatio) · [OIWeighted](/Indicators/Indicator-OIWeighted) ·
[OpenInterestDelta](/Indicators/Indicator-OpenInterestDelta) · [OpenInterestMomentum](/Indicators/Indicator-OpenInterestMomentum) ·
[PerpetualPremiumIndex](/Indicators/Indicator-PerpetualPremiumIndex) · [TakerBuySellRatio](/Indicators/Indicator-TakerBuySellRatio) ·
[TermStructureBasis](/Indicators/Indicator-TermStructureBasis)

### Alt-Chart Bars (10)

[DollarBars](/Indicators/Indicator-DollarBars) · [ImbalanceBars](/Indicators/Indicator-ImbalanceBars) ·
[KagiBars](/Indicators/Indicator-KagiBars) · [PointAndFigureBars](/Indicators/Indicator-PointAndFigureBars) ·
[RangeBars](/Indicators/Indicator-RangeBars) · [RenkoBars](/Indicators/Indicator-RenkoBars) ·
[RunBars](/Indicators/Indicator-RunBars) · [ThreeLineBreakBars](/Indicators/Indicator-ThreeLineBreakBars) ·
[TickBars](/Indicators/Indicator-TickBars) · [VolumeBars](/Indicators/Indicator-VolumeBars)

### Market Breadth (15)

[AbsoluteBreadthIndex](/Indicators/Indicator-AbsoluteBreadthIndex) · [AdvanceDecline](/Indicators/Indicator-AdvanceDecline) ·
[AdvanceDeclineRatio](/Indicators/Indicator-AdvanceDeclineRatio) · [AdVolumeLine](/Indicators/Indicator-AdVolumeLine) ·
[BreadthThrust](/Indicators/Indicator-BreadthThrust) · [BullishPercentIndex](/Indicators/Indicator-BullishPercentIndex) ·
[CumulativeVolumeIndex](/Indicators/Indicator-CumulativeVolumeIndex) · [HighLowIndex](/Indicators/Indicator-HighLowIndex) ·
[McClellanOscillator](/Indicators/Indicator-McClellanOscillator) · [McClellanSummationIndex](/Indicators/Indicator-McClellanSummationIndex) ·
[NewHighsNewLows](/Indicators/Indicator-NewHighsNewLows) · [PercentAboveMa](/Indicators/Indicator-PercentAboveMa) ·
[TickIndex](/Indicators/Indicator-TickIndex) · [Trin](/Indicators/Indicator-Trin) ·
[UpDownVolumeRatio](/Indicators/Indicator-UpDownVolumeRatio)

### Seasonality & Session (12)

[AverageDailyRange](/Indicators/Indicator-AverageDailyRange) · [DayOfWeekProfile](/Indicators/Indicator-DayOfWeekProfile) ·
[IntradayVolatilityProfile](/Indicators/Indicator-IntradayVolatilityProfile) · [OvernightGap](/Indicators/Indicator-OvernightGap) ·
[OvernightIntradayReturn](/Indicators/Indicator-OvernightIntradayReturn) · [SeasonalZScore](/Indicators/Indicator-SeasonalZScore) ·
[SessionHighLow](/Indicators/Indicator-SessionHighLow) · [SessionRange](/Indicators/Indicator-SessionRange) ·
[SessionVwap](/Indicators/Indicator-SessionVwap) · [TimeOfDayReturnProfile](/Indicators/Indicator-TimeOfDayReturnProfile) ·
[TurnOfMonth](/Indicators/Indicator-TurnOfMonth) · [VolumeByTimeProfile](/Indicators/Indicator-VolumeByTimeProfile)

### Chart Patterns (8)

[CupAndHandle](/Indicators/Indicator-CupAndHandle) · [DoubleTopBottom](/Indicators/Indicator-DoubleTopBottom) ·
[FlagPennant](/Indicators/Indicator-FlagPennant) · [HeadAndShoulders](/Indicators/Indicator-HeadAndShoulders) ·
[RectangleRange](/Indicators/Indicator-RectangleRange) · [Triangle](/Indicators/Indicator-Triangle) ·
[TripleTopBottom](/Indicators/Indicator-TripleTopBottom) · [Wedge](/Indicators/Indicator-Wedge)

### Harmonic Patterns (8)

[Abcd](/Indicators/Indicator-Abcd) · [Bat](/Indicators/Indicator-Bat) ·
[Butterfly](/Indicators/Indicator-Butterfly) · [Crab](/Indicators/Indicator-Crab) ·
[Cypher](/Indicators/Indicator-Cypher) · [Gartley](/Indicators/Indicator-Gartley) ·
[Shark](/Indicators/Indicator-Shark) · [ThreeDrives](/Indicators/Indicator-ThreeDrives)

### Fibonacci (10)

[AutoFib](/Indicators/Indicator-AutoFib) · [FibArcs](/Indicators/Indicator-FibArcs) ·
[FibChannel](/Indicators/Indicator-FibChannel) · [FibConfluence](/Indicators/Indicator-FibConfluence) ·
[FibExtension](/Indicators/Indicator-FibExtension) · [FibFan](/Indicators/Indicator-FibFan) ·
[FibProjection](/Indicators/Indicator-FibProjection) · [FibRetracement](/Indicators/Indicator-FibRetracement) ·
[FibTimeZones](/Indicators/Indicator-FibTimeZones) · [GoldenPocket](/Indicators/Indicator-GoldenPocket)

## See also

- Source code: <https://github.com/wickra-lib/wickra>
- Releases: <https://github.com/wickra-lib/wickra/releases>
- Issue tracker: <https://github.com/wickra-lib/wickra/issues>
