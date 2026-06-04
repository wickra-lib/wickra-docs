# Wickra

Wickra is a streaming-first technical-indicators library. Every indicator is
implemented in Rust as an O(1) state machine that consumes one input at a
time, and the same engine is exposed through ergonomic bindings for Python,
Node.js, WebAssembly, and Rust itself. The same `update` call you write inside
a live trading loop also drives the historical backtest of that same
strategy — there is no second code path that drifts behind the streaming one.

The project ships 377 indicators across twenty-four families — moving averages,
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
| crates.io | `wickra`       | 0.5.3   |
| crates.io | `wickra-core`  | 0.5.3   |
| crates.io | `wickra-data`  | 0.5.3   |
| PyPI      | `wickra`       | 0.5.3   |
| npm       | `wickra`       | 0.5.3   |
| npm       | `wickra-wasm`  | 0.5.3   |

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
twenty-family taxonomy with per-indicator formula / parameter / warmup
tables. The links below are a quick alphabetical-by-family index into the
387 deep-dive pages.

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

### Momentum Oscillators (24)

[AnchoredRsi](Indicator-AnchoredRsi) · [AwesomeOscillator](Indicator-AwesomeOscillator) ·
[Cci](Indicator-Cci) · [Cmo](Indicator-Cmo) ·
[ConnorsRsi](Indicator-ConnorsRsi) · [Inertia](Indicator-Inertia) ·
[Kst](Indicator-Kst) · [LaguerreRsi](Indicator-LaguerreRsi) ·
[Mfi](Indicator-Mfi) · [Mom](Indicator-Mom) ·
[Pgo](Indicator-Pgo) · [Pmo](Indicator-Pmo) ·
[Roc](Indicator-Roc) · [Rocp](Indicator-Rocp) ·
[Rocr](Indicator-Rocr) · [Rocr100](Indicator-Rocr100) ·
[Rsi](Indicator-Rsi) · [Rvi](Indicator-Rvi) ·
[Smi](Indicator-Smi) · [Stochastic](Indicator-Stochastic) ·
[StochRsi](Indicator-StochRsi) · [Tsi](Indicator-Tsi) ·
[UltimateOscillator](Indicator-UltimateOscillator) · [WilliamsR](Indicator-WilliamsR)

### Trend & Directional (21)

[Adx](Indicator-Adx) · [Adxr](Indicator-Adxr) ·
[Aroon](Indicator-Aroon) · [AroonOscillator](Indicator-AroonOscillator) ·
[ChoppinessIndex](Indicator-ChoppinessIndex) · [Dx](Indicator-Dx) ·
[MacdExt](Indicator-MacdExt) · [MacdFix](Indicator-MacdFix) ·
[MacdIndicator](Indicator-MacdIndicator) · [MassIndex](Indicator-MassIndex) ·
[MinusDi](Indicator-MinusDi) · [MinusDm](Indicator-MinusDm) ·
[PlusDi](Indicator-PlusDi) · [PlusDm](Indicator-PlusDm) ·
[Rwi](Indicator-Rwi) · [Tii](Indicator-Tii) ·
[Trix](Indicator-Trix) · [VerticalHorizontalFilter](Indicator-VerticalHorizontalFilter) ·
[Vortex](Indicator-Vortex) · [WaveTrend](Indicator-WaveTrend) ·
[TrendLabel](Indicator-TrendLabel)

### Price Oscillators (11)

[AcceleratorOscillator](Indicator-AcceleratorOscillator) ·
[Apo](Indicator-Apo) ·
[AwesomeOscillatorHistogram](Indicator-AwesomeOscillatorHistogram) ·
[BalanceOfPower](Indicator-BalanceOfPower) · [Cfo](Indicator-Cfo) ·
[Coppock](Indicator-Coppock) · [Dpo](Indicator-Dpo) ·
[ElderImpulse](Indicator-ElderImpulse) · [Ppo](Indicator-Ppo) ·
[Stc](Indicator-Stc) · [ZeroLagMacd](Indicator-ZeroLagMacd)

### Volatility & Bands (20)

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
[YangZhangVolatility](Indicator-YangZhangVolatility) ·
[JumpIndicator](Indicator-JumpIndicator) · [RegimeLabel](Indicator-RegimeLabel)

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

### Trailing Stops (13)

[AtrTrailingStop](Indicator-AtrTrailingStop) · [ChandeKrollStop](Indicator-ChandeKrollStop) ·
[ChandelierExit](Indicator-ChandelierExit) · [DonchianStop](Indicator-DonchianStop) ·
[HiLoActivator](Indicator-HiLoActivator) · [PercentageTrailingStop](Indicator-PercentageTrailingStop) ·
[Psar](Indicator-Psar) · [RenkoTrailingStop](Indicator-RenkoTrailingStop) ·
[SarExt](Indicator-SarExt) · [StepTrailingStop](Indicator-StepTrailingStop) ·
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

### Price Statistics (34)

[Autocorrelation](Indicator-Autocorrelation) · [AvgPrice](Indicator-AvgPrice) ·
[Beta](Indicator-Beta) · [CoefficientOfVariation](Indicator-CoefficientOfVariation) ·
[HurstExponent](Indicator-HurstExponent) · [Kurtosis](Indicator-Kurtosis) ·
[LinearRegression](Indicator-LinearRegression) · [LinRegAngle](Indicator-LinRegAngle) ·
[LinRegIntercept](Indicator-LinRegIntercept) · [LinRegSlope](Indicator-LinRegSlope) ·
[MedianAbsoluteDeviation](Indicator-MedianAbsoluteDeviation) · [MedianPrice](Indicator-MedianPrice) ·
[MidPoint](Indicator-MidPoint) · [MidPrice](Indicator-MidPrice) ·
[PearsonCorrelation](Indicator-PearsonCorrelation) · [RSquared](Indicator-RSquared) ·
[Skewness](Indicator-Skewness) · [SpearmanCorrelation](Indicator-SpearmanCorrelation) ·
[StandardError](Indicator-StandardError) · [Tsf](Indicator-Tsf) ·
[TypicalPrice](Indicator-TypicalPrice) · [Variance](Indicator-Variance) ·
[WeightedClose](Indicator-WeightedClose) · [ZScore](Indicator-ZScore) ·
[BodySizePct](Indicator-BodySizePct) · [CloseVsOpen](Indicator-CloseVsOpen) ·
[HighLowRange](Indicator-HighLowRange) · [LogReturn](Indicator-LogReturn) ·
[RealizedVolatility](Indicator-RealizedVolatility) · [RollingIqr](Indicator-RollingIqr) ·
[RollingPercentileRank](Indicator-RollingPercentileRank) ·
[RollingQuantile](Indicator-RollingQuantile) ·
[SpreadAr1Coefficient](Indicator-SpreadAr1Coefficient) · [WickRatio](Indicator-WickRatio)

### Ehlers / Cycle (DSP) (19)

[AdaptiveCycle](Indicator-AdaptiveCycle) · [CenterOfGravity](Indicator-CenterOfGravity) ·
[CyberneticCycle](Indicator-CyberneticCycle) · [Decycler](Indicator-Decycler) ·
[DecyclerOscillator](Indicator-DecyclerOscillator) · [EhlersStochastic](Indicator-EhlersStochastic) ·
[EmpiricalModeDecomposition](Indicator-EmpiricalModeDecomposition) · [Fama](Indicator-Fama) ·
[FisherTransform](Indicator-FisherTransform) · [HilbertDominantCycle](Indicator-HilbertDominantCycle) ·
[HtDcPhase](Indicator-HtDcPhase) · [HtPhasor](Indicator-HtPhasor) ·
[HtTrendMode](Indicator-HtTrendMode) · [InstantaneousTrendline](Indicator-InstantaneousTrendline) ·
[InverseFisherTransform](Indicator-InverseFisherTransform) · [Mama](Indicator-Mama) ·
[RoofingFilter](Indicator-RoofingFilter) · [SineWave](Indicator-SineWave) ·
[SuperSmoother](Indicator-SuperSmoother)

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

### Candlestick Patterns (60)

[AbandonedBaby](Indicator-AbandonedBaby) ·
[AdvanceBlock](Indicator-AdvanceBlock) · [BeltHold](Indicator-BeltHold) ·
[Breakaway](Indicator-Breakaway) ·
[ClosingMarubozu](Indicator-ClosingMarubozu) ·
[ConcealingBabySwallow](Indicator-ConcealingBabySwallow) ·
[Counterattack](Indicator-Counterattack) · [Doji](Indicator-Doji) ·
[DojiStar](Indicator-DojiStar) ·
[DownsideGapThreeMethods](Indicator-DownsideGapThreeMethods) ·
[DragonflyDoji](Indicator-DragonflyDoji) ·
[Engulfing](Indicator-Engulfing) ·
[EveningDojiStar](Indicator-EveningDojiStar) ·
[FallingThreeMethods](Indicator-FallingThreeMethods) ·
[GapSideBySideWhite](Indicator-GapSideBySideWhite) ·
[GravestoneDoji](Indicator-GravestoneDoji) · [Hammer](Indicator-Hammer) ·
[HangingMan](Indicator-HangingMan) · [Harami](Indicator-Harami) ·
[HighWave](Indicator-HighWave) · [Hikkake](Indicator-Hikkake) ·
[HikkakeModified](Indicator-HikkakeModified) ·
[HomingPigeon](Indicator-HomingPigeon) ·
[IdenticalThreeCrows](Indicator-IdenticalThreeCrows) ·
[InNeck](Indicator-InNeck) · [InvertedHammer](Indicator-InvertedHammer) ·
[Kicking](Indicator-Kicking) ·
[KickingByLength](Indicator-KickingByLength) ·
[LadderBottom](Indicator-LadderBottom) ·
[LongLeggedDoji](Indicator-LongLeggedDoji) ·
[LongLine](Indicator-LongLine) · [Marubozu](Indicator-Marubozu) ·
[MatchingLow](Indicator-MatchingLow) · [MatHold](Indicator-MatHold) ·
[MorningDojiStar](Indicator-MorningDojiStar) ·
[MorningEveningStar](Indicator-MorningEveningStar) ·
[OnNeck](Indicator-OnNeck) · [OpeningMarubozu](Indicator-OpeningMarubozu) ·
[PiercingDarkCloud](Indicator-PiercingDarkCloud) ·
[RickshawMan](Indicator-RickshawMan) ·
[RisingThreeMethods](Indicator-RisingThreeMethods) ·
[SeparatingLines](Indicator-SeparatingLines) ·
[ShootingStar](Indicator-ShootingStar) · [ShortLine](Indicator-ShortLine) ·
[SpinningTop](Indicator-SpinningTop) ·
[StalledPattern](Indicator-StalledPattern) ·
[StickSandwich](Indicator-StickSandwich) · [Takuri](Indicator-Takuri) ·
[TasukiGap](Indicator-TasukiGap) · [ThreeInside](Indicator-ThreeInside) ·
[ThreeLineStrike](Indicator-ThreeLineStrike) ·
[ThreeOutside](Indicator-ThreeOutside) ·
[ThreeSoldiersOrCrows](Indicator-ThreeSoldiersOrCrows) ·
[ThreeStarsInSouth](Indicator-ThreeStarsInSouth) ·
[Thrusting](Indicator-Thrusting) · [Tweezer](Indicator-Tweezer) ·
[TwoCrows](Indicator-TwoCrows) ·
[UniqueThreeRiver](Indicator-UniqueThreeRiver) ·
[UpsideGapThreeMethods](Indicator-UpsideGapThreeMethods) ·
[UpsideGapTwoCrows](Indicator-UpsideGapTwoCrows)

### Market Profile (3)

[InitialBalance](Indicator-InitialBalance) ·
[OpeningRange](Indicator-OpeningRange) · [ValueArea](Indicator-ValueArea)

### Risk / Performance (19)

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
[TreynorRatio](Indicator-TreynorRatio) · [ValueAtRisk](Indicator-ValueAtRisk) ·
[Expectancy](Indicator-Expectancy) · [WinRate](Indicator-WinRate)

### Microstructure (17)

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
[TradeImbalance](Indicator-TradeImbalance) ·
[AmihudIlliquidity](Indicator-AmihudIlliquidity) ·
[OrderFlowImbalance](Indicator-OrderFlowImbalance) ·
[RollMeasure](Indicator-RollMeasure) · [Vpin](Indicator-Vpin)

### Derivatives (12)

[CalendarSpread](Indicator-CalendarSpread) ·
[FundingBasis](Indicator-FundingBasis) ·
[FundingRate](Indicator-FundingRate) ·
[FundingRateMean](Indicator-FundingRateMean) ·
[FundingRateZScore](Indicator-FundingRateZScore) ·
[LiquidationFeatures](Indicator-LiquidationFeatures) ·
[LongShortRatio](Indicator-LongShortRatio) ·
[OIPriceDivergence](Indicator-OIPriceDivergence) ·
[OIWeighted](Indicator-OIWeighted) ·
[OpenInterestDelta](Indicator-OpenInterestDelta) ·
[TakerBuySellRatio](Indicator-TakerBuySellRatio) ·
[TermStructureBasis](Indicator-TermStructureBasis)

### Market Breadth (15)

[AbsoluteBreadthIndex](Indicator-AbsoluteBreadthIndex) ·
[AdvanceDecline](Indicator-AdvanceDecline) ·
[AdvanceDeclineRatio](Indicator-AdvanceDeclineRatio) ·
[AdVolumeLine](Indicator-AdVolumeLine) ·
[BreadthThrust](Indicator-BreadthThrust) ·
[BullishPercentIndex](Indicator-BullishPercentIndex) ·
[CumulativeVolumeIndex](Indicator-CumulativeVolumeIndex) ·
[HighLowIndex](Indicator-HighLowIndex) ·
[McClellanOscillator](Indicator-McClellanOscillator) ·
[McClellanSummationIndex](Indicator-McClellanSummationIndex) ·
[NewHighsNewLows](Indicator-NewHighsNewLows) ·
[PercentAboveMa](Indicator-PercentAboveMa) ·
[TickIndex](Indicator-TickIndex) ·
[Trin](Indicator-Trin) ·
[UpDownVolumeRatio](Indicator-UpDownVolumeRatio)

## See also

- Source code: <https://github.com/wickra-lib/wickra>
- Releases: <https://github.com/wickra-lib/wickra/releases>
- Issue tracker: <https://github.com/wickra-lib/wickra/issues>
