# Indicators Overview

Wickra ships **488 indicators** organised into **twenty-four families**. Each
family collects indicators that answer the same kind of question, so the
taxonomy here maps one-to-one onto the
`crates/wickra-core/src/indicators/` source layout.

Every indicator is an O(1) state machine that consumes one input at a time
and produces either `Option<f64>` (Rust), `float | None` (Python), or
`number | null` (Node). Inputs are either a `f64` close price or an OHLCV
`Candle` (Rust) / dict-or-tuple (Python) / column arrays (Node). The full
trait surface and warmup-period semantics are covered in
[Quickstart: Rust](Quickstart-Rust) and [Warmup Periods](Warmup-Periods).

The "Output range" column is the value bounds an indicator emits once warm;
"unbounded" means it tracks the price scale of the input. The "Warmup" column
quotes `warmup_period()` as the indicator reports it — the **exact**
first-emission index: the first non-`None` output lands on input
`warmup_period()` (0-indexed `warmup_period() - 1`).

The twenty-four families:

| # | Family | Count | What it answers |
|---|--------|-------|-----------------|
| 1 | [Moving Averages](#moving-averages) | 26 | Where is the smoothed trend line? |
| 2 | [Momentum Oscillators](#momentum-oscillators) | 34 | How fast is price changing; is it overbought? |
| 3 | [Trend & Directional](#trend--directional) | 28 | Is there a trend, and which way? |
| 4 | [Price Oscillators](#price-oscillators) | 14 | Difference-of-averages momentum around zero. |
| 5 | [Volatility & Bands](#volatility--bands) | 18 | How wide is the range; where are the envelopes? |
| 6 | [Bands & Channels](#bands--channels) | 11 | Price-envelope overlays beyond the volatility staples. |
| 7 | [Trailing Stops](#trailing-stops) | 13 | Where is the stop-loss for this trend? |
| 8 | [Volume](#volume) | 19 | Is volume confirming the move? |
| 9 | [Price Statistics](#price-statistics) | 24 | Per-bar price transforms and rolling regressions / statistics. |
| 10 | [Ehlers / Cycle (DSP)](#ehlers--cycle-dsp) | 19 | Cycle-extracting DSP filters and phase-aware tools. |
| 11 | [Pivots & S/R](#pivots--sr) | 7 | Session-anchored pivot levels and swing detectors. |
| 12 | [DeMark](#demark) | 12 | Tom DeMark's exhaustion / setup / countdown family. |
| 13 | [Ichimoku & Charts](#ichimoku--charts) | 2 | Japanese cloud chart and smoothed candles. |
| 14 | [Candlestick Patterns](#candlestick-patterns) | 60 | Classical 1- / 2- / 3-bar candle patterns. |
| 15 | [Market Profile](#market-profile) | 5 | Session value-area / opening-range / IB levels. |
| 16 | [Risk / Performance](#risk--performance) | 17 | Risk-adjusted return, drawdown, and tail-risk metrics. |
| 17 | [Microstructure](#microstructure) | 13 | Order-book, trade-flow, price-impact and footprint analytics. |
| 18 | [Derivatives](#derivatives) | 12 | Funding, open-interest, positioning, flow and basis on a perp/futures feed. |
| 19 | [Alt-Chart Bars](#alt-chart-bars) | 3 | Price-driven Renko / Kagi / Point & Figure bar builders. |
| 20 | [Market Breadth](#market-breadth) | 15 | Universe-wide advance/decline participation. |
| 21 | [Seasonality & Session](#seasonality--session) | 12 | When in the day / week / month does this happen? |
| 22 | [Chart Patterns](#chart-patterns) | 8 | Swing-based classical chart patterns — double/triple tops, head & shoulders, triangles, wedges, flags, rectangles, cup & handle. |
| 23 | [Harmonic Patterns](#harmonic-patterns) | 8 | Fibonacci-ratio XABCD patterns — Gartley, Bat, Butterfly, Crab, Shark, Cypher, AB=CD, Three Drives. |
| 24 | [Fibonacci](#fibonacci) | 10 | Swing-based Fibonacci tooling — retracement, extension, projection, auto-fib, golden pocket, confluence, fan, arcs, channel, time zones. |

## Moving Averages

Smooth the price series to surface direction. All are single-input,
single-output (`f64 → f64`) except `Vwma`, which weights by volume.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Sma`   | Equal-weighted rolling mean over `period` closes. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Sma](/Indicators/Indicator-Sma) |
| `Ema`   | EMA with `α = 2 / (period + 1)`, SMA-seeded. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Ema](/Indicators/Indicator-Ema) |
| `Wma`   | Linear weights `1, 2, …, period`; newest bar matters most. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Wma](/Indicators/Indicator-Wma) |
| `Dema`  | Mulloy's `2·EMA − EMA(EMA)`; removes first-order EMA lag. | `f64` | `f64` | unbounded (price scale) | `period` | `2·period − 1` | [Indicator-Dema](/Indicators/Indicator-Dema) |
| `Tema`  | Mulloy's `3·EMA − 3·EMA(EMA) + EMA(EMA(EMA))`. | `f64` | `f64` | unbounded (price scale) | `period` | `3·period − 2` | [Indicator-Tema](/Indicators/Indicator-Tema) |
| `Hma`   | Hull's near-zero-lag `WMA(2·WMA(n/2) − WMA(n), √n)`. | `f64` | `f64` | unbounded (price scale) | `period` | `period + round(√period) − 1` | [Indicator-Hma](/Indicators/Indicator-Hma) |
| `Kama`  | Kaufman's adaptive average; efficiency ratio picks α per bar. | `f64` | `f64` | unbounded (price scale) | `(er_period=10, fast=2, slow=30)` | `er_period + 1` | [Indicator-Kama](/Indicators/Indicator-Kama) |
| `Smma`  | Wilder's RMA: SMA-seeded exponential average, `1/period` factor. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Smma](/Indicators/Indicator-Smma) |
| `Trima` | A `period`-window SMA applied twice; triangular weights. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Trima](/Indicators/Indicator-Trima) |
| `Zlema` | EMA of the de-lagged series `2·price − price[lag]`. | `f64` | `f64` | unbounded (price scale) | `period` | `lag + period` | [Indicator-Zlema](/Indicators/Indicator-Zlema) |
| `T3`    | Tillson's six-EMA cascade recombined with a volume factor `v`. | `f64` | `f64` | unbounded (price scale) | `(period, v=0.7)` (Python) | `6·period − 5` | [Indicator-T3](/Indicators/Indicator-T3) |
| `Vwma`  | Rolling mean of closes weighted by each bar's volume. | `Candle` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Vwma](/Indicators/Indicator-Vwma) |
| `Alma`  | Gaussian-weighted MA, kernel centred at `offset · (period − 1)`. | `f64` | `f64` | unbounded (price scale) | `(period=9, offset=0.85, sigma=6.0)` | `period` | [Indicator-Alma](/Indicators/Indicator-Alma) |
| `McGinleyDynamic` | Self-adjusting MA, `MD + (price − MD) / (0.6 · period · (price / MD)⁴)`. | `f64` | `f64` | unbounded (price scale) | `period` (10 in Python) | `period` | [Indicator-McGinleyDynamic](/Indicators/Indicator-McGinleyDynamic) |
| `Frama` | Ehlers' fractal-dimension-adaptive EMA over close-only window halves. | `f64` | `f64` | unbounded (price scale) | `period=16` (even) | `period` | [Indicator-Frama](/Indicators/Indicator-Frama) |
| `Vidya` | EMA whose alpha scales with \|CMO(cmo_period)\| / 100. | `f64` | `f64` | unbounded (price scale) | `(period=14, cmo_period=9)` | `cmo_period + 1` | [Indicator-Vidya](/Indicators/Indicator-Vidya) |
| `Jma`   | Jurik MA — three-stage filter reconstruction. | `f64` | `f64` | unbounded (price scale) | `(period=14, phase=0, power=2)` | `1` | [Indicator-Jma](/Indicators/Indicator-Jma) |
| `Alligator` | Three `Smma`s of `(high + low) / 2`: Jaw / Teeth / Lips. | `Candle` | `AlligatorOutput` (3) | unbounded (price scale) | `(jaw=13, teeth=8, lips=5)` | `max(jaw, teeth, lips)` | [Indicator-Alligator](/Indicators/Indicator-Alligator) |
| `Evwma` | Elastic volume-weighted recurrence over a rolling window. | `Candle` | `f64` | unbounded (price scale) | `period` (20 in Python) | `period` | [Indicator-Evwma](/Indicators/Indicator-Evwma) |
| `AdaptiveLaguerreFilter` | Four-stage Laguerre filter whose damping adapts to tracking error. | `f64` | `f64` | price-bounded (no overshoot) | `period` | `period` | [Indicator-AdaptiveLaguerreFilter](/Indicators/Indicator-AdaptiveLaguerreFilter) |
| `Ehma` | Exponential Hull MA — `EMA(2·EMA(n/2) − EMA(n), √n)`, low lag. | `f64` | `f64` | unbounded (price scale) | `period` | `period + round(√period) − 1` | [Indicator-Ehma](/Indicators/Indicator-Ehma) |
| `GeneralizedDema` | Tillson volume-factor double EMA `(1 + v)·EMA − v·EMA(EMA)`. | `f64` | `f64` | unbounded (price scale) | `(period, v=0.7)` | `2·period − 1` | [Indicator-GeneralizedDema](/Indicators/Indicator-GeneralizedDema) |
| `GeometricMa` | Rolling geometric mean of the last `period` prices. | `f64` | `f64` | `(0, ∞)` | `period` | `period` | [Indicator-GeometricMa](/Indicators/Indicator-GeometricMa) |
| `HoltWinters` | Holt double-exp smoothing (level + trend); one-step forecast. | `f64` | `f64` | unbounded (price scale) | `(alpha=0.2, beta=0.1)` | `2` | [Indicator-HoltWinters](/Indicators/Indicator-HoltWinters) |
| `MedianMa` | Rolling median of the last `period` prices (outlier-robust). | `f64` | `f64` | unbounded (window min/max) | `period` | `period` | [Indicator-MedianMa](/Indicators/Indicator-MedianMa) |
| `SineWeightedMa` | Sine-weighted MA (half-cycle weights, centre-heavy). | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-SineWeightedMa](/Indicators/Indicator-SineWeightedMa) |

## Momentum Oscillators

Measure the *rate* of price change. Several are bounded by construction
(0–100 / ±100 oscillators), the rest are difference-driven.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Rsi`        | Wilder's RSI; smoothed `gain / (gain + loss) × 100`. | `f64` | `f64` | `[0, 100]` | `period = 14` (Python) | `period + 1` | [Indicator-Rsi](/Indicators/Indicator-Rsi) |
| `AnchoredRsi` | Cumulative RSI from a user-set anchor bar (RSI of the whole leg). | `f64` | `f64` | `[0, 100]` | (set anchor via `set_anchor()`) | `2` | [Indicator-AnchoredRsi](/Indicators/Indicator-AnchoredRsi) |
| `Stochastic` | `%K = (close − low_n)/(high_n − low_n) × 100`, smoothed into `%D`. | `Candle` | `(k, d)` | each in `[0, 100]` | `(k_period=14, d_period=3)` (Python) | `k_period + d_period − 1` | [Indicator-Stochastic](/Indicators/Indicator-Stochastic) |
| `Cci`        | `(typical − SMA(typical)) / (0.015 · mean_dev)`. | `Candle` | `f64` | unbounded (typically `±100`–`±200`) | `period = 20` (Python) | `period` | [Indicator-Cci](/Indicators/Indicator-Cci) |
| `Roc`        | `(price − price_n) / price_n × 100`; raw percentage change. | `f64` | `f64` | unbounded around zero | `period` | `period + 1` | [Indicator-Roc](/Indicators/Indicator-Roc) |
| `WilliamsR`  | `−100 × (high_n − close) / (high_n − low_n)`. | `Candle` | `f64` | `[−100, 0]` | `period = 14` (Python) | `period` | [Indicator-WilliamsR](/Indicators/Indicator-WilliamsR) |
| `Mfi`        | "Volume-weighted RSI": Wilder smoothing of money-flow ratios. | `Candle` | `f64` | `[0, 100]` | `period = 14` (Python) | `period` | [Indicator-Mfi](/Indicators/Indicator-Mfi) |
| `AwesomeOscillator` | `SMA(median, fast) − SMA(median, slow)`; zero-line crossover. | `Candle` | `f64` | unbounded around zero | `(fast=5, slow=34)` (Python) | `slow_period` | [Indicator-AwesomeOscillator](/Indicators/Indicator-AwesomeOscillator) |
| `Mom`        | `price − price[period]`; raw price-difference momentum. | `f64` | `f64` | unbounded around zero | `period = 10` (Python) | `period + 1` | [Indicator-Mom](/Indicators/Indicator-Mom) |
| `Cmo`        | Chande Momentum Oscillator; `100·(Σgain − Σloss)/(Σgain + Σloss)`. | `f64` | `f64` | `[−100, 100]` | `period = 14` (Python) | `period + 1` | [Indicator-Cmo](/Indicators/Indicator-Cmo) |
| `Tsi`        | True Strength Index; double-EMA-smoothed momentum ratio. | `f64` | `f64` | ≈ `[−100, 100]` | `(long=25, short=13)` (Python) | `long + short` | [Indicator-Tsi](/Indicators/Indicator-Tsi) |
| `Pmo`        | DecisionPoint Price Momentum Oscillator; doubly-smoothed ROC. | `f64` | `f64` | unbounded around zero | `(smoothing1=35, smoothing2=20)` (Python) | `2` | [Indicator-Pmo](/Indicators/Indicator-Pmo) |
| `StochRsi`   | Stochastic Oscillator applied to the RSI series. | `f64` | `f64` | `[0, 100]` | `(rsi_period=14, stoch_period=14)` (Python) | `rsi_period + stoch_period` | [Indicator-StochRsi](/Indicators/Indicator-StochRsi) |
| `UltimateOscillator` | Larry Williams' weighted three-timeframe buying-pressure oscillator. | `Candle` | `f64` | `[0, 100]` | `(short=7, mid=14, long=28)` (Python) | `max(short,mid,long) + 1` | [Indicator-UltimateOscillator](/Indicators/Indicator-UltimateOscillator) |
| `Rvi`        | `SMA(close − open, period) / SMA(high − low, period)`. | `Candle` | `f64` | unbounded (typically `(−1, 1)`) | `period = 10` (Python) | `period` | [Indicator-Rvi](/Indicators/Indicator-Rvi) |
| `Pgo`        | `(close − SMA(close, period)) / EMA(TR, period)`. | `Candle` | `f64` | unbounded | `period = 14` (Python) | `period` | [Indicator-Pgo](/Indicators/Indicator-Pgo) |
| `Kst`        | Pring's `1·RCMA_1 + 2·RCMA_2 + 3·RCMA_3 + 4·RCMA_4`, plus SMA signal. | `f64` | `(kst, signal)` | unbounded | 9 periods, see deep-dive | longest `roc_i + sma_i` + `signal − 1` | [Indicator-Kst](/Indicators/Indicator-Kst) |
| `Smi`        | Blau's doubly-EMA-smoothed close-vs-range displacement. | `Candle` | `f64` | `[−100, 100]` | `(period=5, d=3, d2=3)` | `period + d + d2 − 2` | [Indicator-Smi](/Indicators/Indicator-Smi) |
| `LaguerreRsi` | Ehlers' 4-stage Laguerre filter with RSI up/down accumulator. | `f64` | `f64` | `[0, 100]` (clamped) | `gamma = 0.5` | `1` | [Indicator-LaguerreRsi](/Indicators/Indicator-LaguerreRsi) |
| `ConnorsRsi` | Average of `RSI(close)`, `RSI(streak)`, percentile-rank of returns. | `f64` | `f64` | `[0, 100]` | `(3, 2, 100)` | `max(period_rsi+1, period_streak+2, period_rank+1)` | [Indicator-ConnorsRsi](/Indicators/Indicator-ConnorsRsi) |
| `Inertia`    | `LinearRegression(RVI(rvi_period), linreg_period)`. | `Candle` | `f64` | unbounded | `(rvi=14, linreg=20)` | `rvi_period + linreg_period − 1` | [Indicator-Inertia](/Indicators/Indicator-Inertia) |
| `Rocp` | Rate of Change Percentage; `(close − close[period]) / close[period]`. | `f64` | `f64` | unbounded around zero | `period` required | `period` | [Indicator-Rocp](/Indicators/Indicator-Rocp) |
| `Rocr` | Rate of Change Ratio; `close / close[period]`. | `f64` | `f64` | `> 0` around `1` | `period` required | `period` | [Indicator-Rocr](/Indicators/Indicator-Rocr) |
| `Rocr100` | Rate of Change Ratio ×100; `close / close[period] · 100`. | `f64` | `f64` | `> 0` around `100` | `period` required | `period` | [Indicator-Rocr100](/Indicators/Indicator-Rocr100) |
| `DerivativeOscillator` | Brown's double-EMA-smoothed RSI minus an SMA signal; zero-centered histogram. | `f64` | `f64` | unbounded (around `0`) | `(14, 5, 3, 9)` | `rsi_period + smooth1 + smooth2 + signal − 2` | [Indicator-DerivativeOscillator](/Indicators/Indicator-DerivativeOscillator) |
| `DisparityIndex` | Percentage gap between price and its SMA (the Japanese *kairi*). | `f64` | `f64` | unbounded (around `0`) | `period` | `period` | [Indicator-DisparityIndex](/Indicators/Indicator-DisparityIndex) |
| `DynamicMomentumIndex` | Chande RSI whose lookback shortens as volatility rises. | `f64` | `f64` | `[0, 100]` | `period` (14) | `31` | [Indicator-DynamicMomentumIndex](/Indicators/Indicator-DynamicMomentumIndex) |
| `ElderRay` | Bull/Bear Power: each bar's high/low vs. an EMA of close. | `Candle` | `ElderRayOutput` (2) | unbounded (bull `>0`, bear `<0`) | `period` (13) | `period` | [Indicator-ElderRay](/Indicators/Indicator-ElderRay) |
| `FisherRsi` | Fisher transform of a normalised RSI; sharp symmetric extremes. | `f64` | `f64` | ≈ `[−3.8, 3.8]` | `period` | `period + 1` | [Indicator-FisherRsi](/Indicators/Indicator-FisherRsi) |
| `IntradayMomentumIndex` | RSI built from the candle body (open→close). | `Candle` | `f64` | `[0, 100]` | `period` | `period` | [Indicator-IntradayMomentumIndex](/Indicators/Indicator-IntradayMomentumIndex) |
| `Qqe` | Smoothed RSI with an "ATR-of-RSI" trailing line. | `f64` | `QqeOutput` (2) | `[0, 100]`-ish | `(14, 5, 4.236)` | `72` (defaults) | [Indicator-Qqe](/Indicators/Indicator-Qqe) |
| `Rmi` | Wilder RSI over a multi-bar momentum lookback. | `f64` | `f64` | `[0, 100]` | `(period, momentum)` | `momentum + period` | [Indicator-Rmi](/Indicators/Indicator-Rmi) |
| `Rsx` | Jurik-smoothed, low-noise RSI. | `f64` | `f64` | `[0, 100]` | `length` | `length + 1` | [Indicator-Rsx](/Indicators/Indicator-Rsx) |
| `StochasticCci` | Stochastic oscillator over the CCI; bounded `[0, 100]`. | `Candle` | `f64` | `[0, 100]` | `period` | `2·period − 1` | [Indicator-StochasticCci](/Indicators/Indicator-StochasticCci) |

## Trend & Directional

Answer whether a trend exists and which way it points — directional systems,
crossover packages and trend-versus-range filters.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `MacdIndicator` | `EMA(fast) − EMA(slow)` plus a signal EMA and the histogram. | `f64` | `(macd, signal, histogram)` | unbounded around zero | `(fast=12, slow=26, signal=9)` (Python) | `slow + signal − 1` | [Indicator-MacdIndicator](/Indicators/Indicator-MacdIndicator) |
| `Adx`     | Wilder's directional system: `+DI`, `−DI` and the `ADX` strength index. | `Candle` | `(plus_di, minus_di, adx)` | each in `[0, 100]` | `period = 14` (Python) | `2·period` | [Indicator-Adx](/Indicators/Indicator-Adx) |
| `Adxr`    | Wilder's ADX-rating: average of `ADX_t` and `ADX_{t − (period − 1)}`. | `Candle` | `f64` | `[0, 100]` | `period = 14` (Python) | `3·period − 1` | [Indicator-Adxr](/Indicators/Indicator-Adxr) |
| `Aroon`   | Bars-since-high and bars-since-low scaled to `[0, 100]`. | `Candle` | `(up, down)` | each in `[0, 100]` | `period = 14` (Python) | `period + 1` | [Indicator-Aroon](/Indicators/Indicator-Aroon) |
| `Trix`    | Rate of change of a triple-smoothed EMA, `× 10000`. | `f64` | `f64` | unbounded around zero | `period = 15` (Python) | `3·period − 1` | [Indicator-Trix](/Indicators/Indicator-Trix) |
| `AroonOscillator` | `AroonUp − AroonDown`; the two Aroon lines as one gauge. | `Candle` | `f64` | `[−100, 100]` | `period = 14` (Python) | `period + 1` | [Indicator-AroonOscillator](/Indicators/Indicator-AroonOscillator) |
| `Vortex`  | Vortex Indicator `VI+` / `VI−`; crossings mark trend onset. | `Candle` | `(plus, minus)` | each `>= 0` | `period = 14` (Python) | `period + 1` | [Indicator-Vortex](/Indicators/Indicator-Vortex) |
| `Rwi`     | Poulos' Random Walk Index: actual displacement vs `ATR_i · sqrt(i)`. | `Candle` | `(high, low)` | each `>= 0` | `period = 14` (Python) | `period` | [Indicator-Rwi](/Indicators/Indicator-Rwi) |
| `Tii`     | Share of recent SMA-deviations that are positive, scaled to `[0, 100]`. | `f64` | `f64` | `[0, 100]` | `(sma_period=60, dev_period=30)` (Python) | `sma_period + dev_period − 1` | [Indicator-Tii](/Indicators/Indicator-Tii) |
| `WaveTrend` | LazyBear: 3-stage EMA cascade through the typical-price channel index. | `Candle` | `(wt1, wt2)` | typically `[-100, +100]` | `(channel=10, average=21, signal=4)` (Python) | `2·channel + average + signal − 3` | [Indicator-WaveTrend](/Indicators/Indicator-WaveTrend) |
| `MassIndex` | Dorsey's range-expansion sum of the EMA-of-range ratio. | `Candle` | `f64` | `> 0` | `(ema_period=9, sum_period=25)` (Python) | `2·ema_period + sum_period − 2` | [Indicator-MassIndex](/Indicators/Indicator-MassIndex) |
| `ChoppinessIndex` | Summed true range over the high-low span, log-scaled. | `Candle` | `f64` | `[0, 100]` | `period = 14` (Python) | `period` | [Indicator-ChoppinessIndex](/Indicators/Indicator-ChoppinessIndex) |
| `VerticalHorizontalFilter` | Net price move divided by total move over `period`. | `f64` | `f64` | `[0, 1]` | `period = 28` (Python) | `period + 1` | [Indicator-VerticalHorizontalFilter](/Indicators/Indicator-VerticalHorizontalFilter) |
| `MacdFix` | MACD with fast/slow fixed at 12/26; only the signal period is tunable. | `f64` | `(macd, signal, histogram)` | unbounded | `signal` required | same as `MacdIndicator(12, 26, signal)` | [Indicator-MacdFix](/Indicators/Indicator-MacdFix) |
| `MacdExt` | MACD with a selectable MA type (SMA/EMA/WMA/DEMA/TEMA/TRIMA) per line. | `f64` | `(macd, signal, histogram)` | unbounded | `(fast, fast_type, slow, slow_type, signal, signal_type)` | `slow + signal` | [Indicator-MacdExt](/Indicators/Indicator-MacdExt) |
| `PlusDm` | Wilder-smoothed plus directional movement (`+DM`). | `Candle` | `f64` | `>= 0` | `period` required | `period` | [Indicator-PlusDm](/Indicators/Indicator-PlusDm) |
| `MinusDm` | Wilder-smoothed minus directional movement (`−DM`). | `Candle` | `f64` | `>= 0` | `period` required | `period` | [Indicator-MinusDm](/Indicators/Indicator-MinusDm) |
| `PlusDi` | Plus Directional Indicator; `100·smoothed(+DM)/smoothed(TR)`. | `Candle` | `f64` | `[0, 100]` | `period` required | `period` | [Indicator-PlusDi](/Indicators/Indicator-PlusDi) |
| `MinusDi` | Minus Directional Indicator; `100·smoothed(−DM)/smoothed(TR)`. | `Candle` | `f64` | `[0, 100]` | `period` required | `period` | [Indicator-MinusDi](/Indicators/Indicator-MinusDi) |
| `Dx` | Directional Movement Index; `100·abs(+DI − −DI)/(+DI + −DI)`. | `Candle` | `f64` | `[0, 100]` | `period` required | `period` | [Indicator-Dx](/Indicators/Indicator-Dx) |
| `TrendLabel` | Discrete trend state from the sign of the rolling OLS slope. | `f64` | `f64` | `{−1, 0, 1}` | `period >= 2` | `period` | [Indicator-TrendLabel](/Indicators/Indicator-TrendLabel) |
| `GatorOscillator` | Alligator convergence/divergence as a two-sided histogram. | `Candle` | `GatorOscillatorOutput` (2) | `upper ≥ 0`, `lower ≤ 0` | `(13, 8, 5)` | `max(jaw, teeth, lips)` | [Indicator-GatorOscillator](/Indicators/Indicator-GatorOscillator) |
| `KasePermissionStochastic` | Double-smoothed stochastic fast/slow permission filter. | `Candle` | `KasePermissionStochasticOutput` (2) | `[0, 100]` per line | `(length=9, smooth=3)` | `length + 2·smooth − 2` | [Indicator-KasePermissionStochastic](/Indicators/Indicator-KasePermissionStochastic) |
| `PolarizedFractalEfficiency` | Direction-signed trend efficiency (straight vs. jagged path). | `f64` | `f64` | `(−100, +100)` | `(period, smoothing)` | `period + smoothing` | [Indicator-PolarizedFractalEfficiency](/Indicators/Indicator-PolarizedFractalEfficiency) |
| `Qstick` | Running average of the candle body `close − open`. | `Candle` | `f64` | unbounded (price units) | `period` | `period` | [Indicator-Qstick](/Indicators/Indicator-Qstick) |
| `TrendStrengthIndex` | Signed `r²` of a linear regression of price vs. time. | `f64` | `f64` | `[−1, +1]` | `period >= 2` | `period` | [Indicator-TrendStrengthIndex](/Indicators/Indicator-TrendStrengthIndex) |
| `TtmTrend` | `±1` by whether close is above the SMA of median prices. | `Candle` | `f64` | `{+1, −1}` | `period` (6) | `period` | [Indicator-TtmTrend](/Indicators/Indicator-TtmTrend) |
| `WavePm` | Kase variance-normalised peak-momentum statistic. | `f64` | `f64` | `[0, 100)` | `(length=32, smoothing)` | `2·length + smoothing − 1` | [Indicator-WavePm](/Indicators/Indicator-WavePm) |

## Price Oscillators

Difference-of-averages and intrabar oscillators that swing around a zero line.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Ppo`     | Percentage Price Oscillator; `100·(EMA_fast − EMA_slow)/EMA_slow`. | `f64` | `f64` | unbounded around zero (percent) | `(fast=12, slow=26)` (Python) | `slow` | [Indicator-Ppo](/Indicators/Indicator-Ppo) |
| `Dpo`     | Detrended Price Oscillator; `price[t − period/2 − 1] − SMA(period)`. | `f64` | `f64` | unbounded around zero | `period = 20` (Python) | `max(period, period/2 + 2)` | [Indicator-Dpo](/Indicators/Indicator-Dpo) |
| `Coppock` | Coppock Curve; `WMA(ROC(long) + ROC(short), wma_period)`. | `f64` | `f64` | unbounded around zero | `(roc_long=14, roc_short=11, wma_period=10)` (Python) | `max(roc_long, roc_short) + wma_period` | [Indicator-Coppock](/Indicators/Indicator-Coppock) |
| `AcceleratorOscillator` | `AO − SMA(AO, signal)`; the acceleration of momentum. | `Candle` | `f64` | unbounded around zero | `(ao_fast=5, ao_slow=34, signal_period=5)` (Python) | `ao_slow + signal_period − 1` | [Indicator-AcceleratorOscillator](/Indicators/Indicator-AcceleratorOscillator) |
| `BalanceOfPower` | `(close − open) / (high − low)`; intrabar buyer/seller control. | `Candle` | `f64` | `[−1, +1]` | (no parameters) | `1` | [Indicator-BalanceOfPower](/Indicators/Indicator-BalanceOfPower) |
| `Apo`     | Absolute Price Oscillator; raw `EMA_fast − EMA_slow`. | `f64` | `f64` | unbounded around zero | `(fast=12, slow=26)` (Python) | `slow` | [Indicator-Apo](/Indicators/Indicator-Apo) |
| `AwesomeOscillatorHistogram` | `AO − AO_{t-1}`; differenced Awesome Oscillator. | `Candle` | `f64` | unbounded around zero | `(fast=5, slow=34)` (Python) | `slow + 1` | [Indicator-AwesomeOscillatorHistogram](/Indicators/Indicator-AwesomeOscillatorHistogram) |
| `Cfo`     | Chande Forecast Oscillator; `100·(close − linreg_endpoint)/close`. | `f64` | `f64` | unbounded around zero (percent) | `period = 14` (Python) | `period` | [Indicator-Cfo](/Indicators/Indicator-Cfo) |
| `ZeroLagMacd` | MACD with ZLEMA in place of EMA; faster, slightly noisier. | `f64` | `(macd, signal, histogram)` | unbounded around zero | `(fast=12, slow=26, signal=9)` | `~50` | [Indicator-ZeroLagMacd](/Indicators/Indicator-ZeroLagMacd) |
| `ElderImpulse` | Alexander Elder's `(EMA-slope, MACD-hist-slope)` regime classifier. | `f64` | `f64` (-1, 0, +1) | `{-1, 0, +1}` | `(ema_period=13, macd...)` (Python) | `slow + signal − 1` | [Indicator-ElderImpulse](/Indicators/Indicator-ElderImpulse) |
| `Stc`     | Schaff Trend Cycle; double-stochastic of MACD. | `f64` | `f64` | `[0, 100]` | `(fast=23, slow=50, cycle=10)` (Python) | `~slow + cycle` | [Indicator-Stc](/Indicators/Indicator-Stc) |
| `TsfOscillator` | Time Series Forecast Oscillator; `100·(close − TSF)/close` (one bar ahead). | `f64` | `f64` | unbounded around zero (percent) | `period = 14` (Python) | `period` | [Indicator-TsfOscillator](/Indicators/Indicator-TsfOscillator) |
| `MacdHistogram` | Standalone MACD histogram; `macd − signal`. | `f64` | `f64` | unbounded around zero | `(fast=12, slow=26, signal=9)` (Python) | `slow + signal − 1` | [Indicator-MacdHistogram](/Indicators/Indicator-MacdHistogram) |
| `PpoHistogram` | PPO histogram; `ppo − EMA(ppo, signal)`, scale-free. | `f64` | `f64` | unbounded around zero (percent) | `(fast=12, slow=26, signal=9)` (Python) | `slow + signal − 1` | [Indicator-PpoHistogram](/Indicators/Indicator-PpoHistogram) |

## Volatility & Bands

Indicators that measure dispersion / range and those that draw an envelope
around price.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Atr`     | Wilder-smoothed True Range; per-bar absolute volatility. | `Candle` | `f64` | `[0, ∞)` (price scale) | `period = 14` (Python) | `period` | [Indicator-Atr](/Indicators/Indicator-Atr) |
| `BollingerBands` | SMA middle band with `±multiplier × population_stddev` bands. | `f64` | `(upper, middle, lower, stddev)` | unbounded (price scale) | `(period=20, multiplier=2.0)` (Python) | `period` | [Indicator-BollingerBands](/Indicators/Indicator-BollingerBands) |
| `Keltner` | EMA middle band with `±multiplier × ATR` bands. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `(ema_period=20, atr_period=10, multiplier=2.0)` (Python) | `max(ema_period, atr_period)` | [Indicator-Keltner](/Indicators/Indicator-Keltner) |
| `Donchian` | Highest high and lowest low over `period` bars. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `period = 20` (Python) | `period` | [Indicator-Donchian](/Indicators/Indicator-Donchian) |
| `Natr`    | `100·ATR/close`; ATR as a percentage. | `Candle` | `f64` | `[0, ∞)` (percent) | `period = 14` (Python) | `period` | [Indicator-Natr](/Indicators/Indicator-Natr) |
| `StdDev`  | Rolling population standard deviation of price. | `f64` | `f64` | `[0, ∞)` (price scale) | `period = 20` (Python) | `period` | [Indicator-StdDev](/Indicators/Indicator-StdDev) |
| `UlcerIndex` | RMS of trailing-high drawdowns; downside-only risk. | `f64` | `f64` | `[0, ∞)` (percent) | `period = 14` (Python) | `2·period − 1` | [Indicator-UlcerIndex](/Indicators/Indicator-UlcerIndex) |
| `HistoricalVolatility` | Annualised sample stddev of log returns. | `f64` | `f64` | `[0, ∞)` (annualised percent) | `(period=20, trading_periods=252)` (Python) | `period + 1` | [Indicator-HistoricalVolatility](/Indicators/Indicator-HistoricalVolatility) |
| `BollingerBandwidth` | `(upper − lower) / middle` of the Bollinger Bands. | `f64` | `f64` | `[0, ∞)` | `(period=20, multiplier=2.0)` (Python) | `period` | [Indicator-BollingerBandwidth](/Indicators/Indicator-BollingerBandwidth) |
| `PercentB` | `(price − lower) / (upper − lower)`; price position in the bands. | `f64` | `f64` | unbounded (`0`–`1` inside) | `(period=20, multiplier=2.0)` (Python) | `period` | [Indicator-PercentB](/Indicators/Indicator-PercentB) |
| `TrueRange` | `max(H−L, \|H−prevC\|, \|L−prevC\|)`; raw single-bar volatility. | `Candle` | `f64` | `[0, ∞)` (price scale) | (no parameters) | `1` | [Indicator-TrueRange](/Indicators/Indicator-TrueRange) |
| `ChaikinVolatility` | Rate of change of an EMA-smoothed high-low spread. | `Candle` | `f64` | unbounded around zero (percent) | `(ema_period=10, roc_period=10)` (Python) | `ema_period + roc_period` | [Indicator-ChaikinVolatility](/Indicators/Indicator-ChaikinVolatility) |
| `DetrendedStdDev` | Standard deviation of OLS residuals — noise around the trend. | `f64` | `f64` | `[0, ∞)` (price scale) | `period` | `period` | [Indicator-DetrendedStdDev](/Indicators/Indicator-DetrendedStdDev) |
| `RVIVolatility` | RSI-shaped volatility *direction* gauge built on rolling stddev. | `f64` | `f64` | `[0, 100]` | `period = 10` (Python) | `2·period − 1` | [Indicator-RviVolatility](/Indicators/Indicator-RviVolatility) |
| `ParkinsonVolatility` | High-low realised vol; ~5× more efficient than C2C stddev. | `Candle` | `f64` | `[0, ∞)` (annualised percent) | `(period=20, trading_periods=252)` (Python) | `period` | [Indicator-ParkinsonVolatility](/Indicators/Indicator-ParkinsonVolatility) |
| `GarmanKlassVolatility` | OHLC realised vol; ~7.4× efficient, biased under drift. | `Candle` | `f64` | `[0, ∞)` (annualised percent) | `(period=20, trading_periods=252)` (Python) | `period` | [Indicator-GarmanKlassVolatility](/Indicators/Indicator-GarmanKlassVolatility) |
| `RogersSatchellVolatility` | Drift-free OHLC realised vol; exact under arbitrary Brownian drift. | `Candle` | `f64` | `[0, ∞)` (annualised percent) | `(period=20, trading_periods=252)` (Python) | `period` | [Indicator-RogersSatchellVolatility](/Indicators/Indicator-RogersSatchellVolatility) |
| `YangZhangVolatility` | Drift- and gap-robust OHLC blend of overnight, open-close and Rogers-Satchell. | `Candle` | `f64` | `[0, ∞)` (annualised percent) | `(period=20, trading_periods=252)` (Python) | `period + 1` | [Indicator-YangZhangVolatility](/Indicators/Indicator-YangZhangVolatility) |
| `JumpIndicator` | Return-outlier flag vs trailing volatility (deviation from the mean). | `f64` | `f64` | `{−1, 0, 1}` | `(period, threshold)` | `period + 2` | [Indicator-JumpIndicator](/Indicators/Indicator-JumpIndicator) |
| `RegimeLabel` | Volatility-quantile regime: `−1` calm / `0` normal / `+1` stressed. | `f64` | `f64` | `{−1, 0, 1}` | `(vol_period, lookback)` | `vol_period + lookback` | [Indicator-RegimeLabel](/Indicators/Indicator-RegimeLabel) |

## Bands & Channels

Price-envelope overlays beyond the volatility-housed Bollinger / Keltner /
Donchian trio. Eleven additional bands organised by what *drives* their
width: fixed percent, ATR, range, regression-residual stddev, fractal
swings, or volume-weighted stddev.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `MaEnvelope` | SMA centerline with fixed-percent envelope. | `f64` | `(upper, middle, lower)` | unbounded (price scale) | `(period=20, percent=0.025)` (Python) | `period` | [Indicator-MaEnvelope](/Indicators/Indicator-MaEnvelope) |
| `AccelerationBands` | Price Headley's momentum-biased bands; width scales with `(H − L) / (H + L)`. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `(period=20, factor=0.001)` (Python) | `period` | [Indicator-AccelerationBands](/Indicators/Indicator-AccelerationBands) |
| `StarcBands` | Stoller Average Range Channel — `SMA(close) ± k·ATR`. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `(sma_period=6, atr_period=15, multiplier=2.0)` (Python) | `max(sma_period, atr_period)` | [Indicator-StarcBands](/Indicators/Indicator-StarcBands) |
| `AtrBands` | Close-anchored envelope `close ± k·ATR`; stop/target bracket. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `(period=14, multiplier=3.0)` (Python) | `period` | [Indicator-AtrBands](/Indicators/Indicator-AtrBands) |
| `HurstChannel` | SMA centerline wrapped by the rolling high-low range. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `(period=10, multiplier=0.5)` (Python) | `period` | [Indicator-HurstChannel](/Indicators/Indicator-HurstChannel) |
| `LinRegChannel` | OLS endpoint `± k · σ` of regression residuals. | `f64` | `(upper, middle, lower)` | unbounded (price scale) | `(period=20, multiplier=2.0)` (Python) | `period` | [Indicator-LinRegChannel](/Indicators/Indicator-LinRegChannel) |
| `StandardErrorBands` | OLS endpoint `± k · stderr` (`n − 2` denominator). | `f64` | `(upper, middle, lower)` | unbounded (price scale) | `(period=21, multiplier=2.0)` (Python) | `period` | [Indicator-StandardErrorBands](/Indicators/Indicator-StandardErrorBands) |
| `DoubleBollinger` | Two concentric Bollinger envelopes (`±k_inner·σ`, `±k_outer·σ`). | `f64` | 5 bands | unbounded (price scale) | `(period=20, k_inner=1.0, k_outer=2.0)` (Python) | `period` | [Indicator-DoubleBollinger](/Indicators/Indicator-DoubleBollinger) |
| `TtmSqueeze` | BB-inside-KC squeeze flag + detrended-close momentum (LinReg). | `Candle` | `(squeeze, momentum)` | `squeeze ∈ {0,1}`; `momentum` unbounded | `(period=20, bb_mult=2.0, kc_mult=1.5)` (Python) | `period` | [Indicator-TtmSqueeze](/Indicators/Indicator-TtmSqueeze) |
| `FractalChaosBands` | Step-function envelope of the latest Bill Williams 5-bar fractals. | `Candle` | `(upper, lower)` | unbounded (price scale) | `k = 2` (Python) | `2k + 1` plus first fractal of each kind | [Indicator-FractalChaosBands](/Indicators/Indicator-FractalChaosBands) |
| `VwapStdDevBands` | Cumulative VWAP `± k·σ` (volume-weighted standard deviation). | `Candle` | `(upper, middle, lower, stddev)` | unbounded (price scale) | `multiplier = 2.0` (Python) | `1` | [Indicator-VwapStdDevBands](/Indicators/Indicator-VwapStdDevBands) |

## Trailing Stops

ATR-driven stop-loss trackers: per-bar levels that follow a trend and flip
when price closes through them.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Psar`    | Wilder's Parabolic Stop-and-Reverse; flips sides on a crossing. | `Candle` | `f64` | unbounded (price scale) | `(af_start=0.02, af_step=0.02, af_max=0.20)` (Python) | `2` | [Indicator-Psar](/Indicators/Indicator-Psar) |
| `SuperTrend` | ATR-banded trailing stop with explicit flip logic. | `Candle` | `(value, direction)` | `value` price scale; `direction` `±1` | `(atr_period=10, multiplier=3.0)` (Python) | `atr_period` | [Indicator-SuperTrend](/Indicators/Indicator-SuperTrend) |
| `ChandelierExit` | `highest_high − k·ATR` (long) and `lowest_low + k·ATR` (short). | `Candle` | `(long_stop, short_stop)` | unbounded (price scale) | `(period=22, multiplier=3.0)` (Python) | `period` | [Indicator-ChandelierExit](/Indicators/Indicator-ChandelierExit) |
| `ChandeKrollStop` | Two-stage ATR stop: extreme-based, then smoothed. | `Candle` | `(stop_long, stop_short)` | unbounded (price scale) | `(atr_period=10, atr_multiplier=1.0, stop_period=9)` (Python) | `atr_period + stop_period − 1` | [Indicator-ChandeKrollStop](/Indicators/Indicator-ChandeKrollStop) |
| `AtrTrailingStop` | A single line trailing the close by `k·ATR`, ratcheting. | `Candle` | `f64` | unbounded (price scale) | `(atr_period=14, multiplier=3.0)` (Python) | `atr_period` | [Indicator-AtrTrailingStop](/Indicators/Indicator-AtrTrailingStop) |
| `HiLoActivator` | SMA(high) / SMA(low) state-machine trail (Crabel-style). | `Candle` | `f64` | unbounded (price scale) | `period = 3` (Python) | `period + 1` | [Indicator-HiLoActivator](/Indicators/Indicator-HiLoActivator) |
| `VoltyStop` | Kase's extreme-close-anchored ATR trail (no give-back on pullbacks). | `Candle` | `f64` | unbounded (price scale) | `(atr_period=14, multiplier=2.0)` | `atr_period + 1` | [Indicator-VoltyStop](/Indicators/Indicator-VoltyStop) |
| `YoyoExit` | Long-only ATR trail with passive re-entry trigger above the trail. | `Candle` | `f64` | unbounded (price scale) | `(atr_period=14, multiplier=2.0)` | `atr_period + 1` | [Indicator-YoyoExit](/Indicators/Indicator-YoyoExit) |
| `DonchianStop` | Turtle exit channel: lowest low / highest high over `period`. | `Candle` | `(stop_long, stop_short)` | unbounded (price scale) | `period = 10` | `period` | [Indicator-DonchianStop](/Indicators/Indicator-DonchianStop) |
| `PercentageTrailingStop` | Fixed-percentage flip-on-close-through trail. | `f64` | `f64` | unbounded (price scale) | `percent = 5.0` | `1` | [Indicator-PercentageTrailingStop](/Indicators/Indicator-PercentageTrailingStop) |
| `StepTrailingStop` | Grid-snapped trail; ratchets in discrete `step_size` increments. | `f64` | `f64` | unbounded (price scale, snapped) | `step_size = 1.0` | `1` | [Indicator-StepTrailingStop](/Indicators/Indicator-StepTrailingStop) |
| `RenkoTrailingStop` | Renko-brick-anchored trail; anchor moves only after full-brick advance. | `f64` | `f64` | unbounded (price scale) | `block_size = 1.0` | `1` | [Indicator-RenkoTrailingStop](/Indicators/Indicator-RenkoTrailingStop) |
| `SarExt` | Extended Parabolic SAR: start value, reversal offset, separate long/short acceleration, signed output. | `Candle` | `f64` (signed) | price scale; sign = direction | Wilder defaults `(0.02, 0.02, 0.20)` both ways | `2` | [Indicator-SarExt](/Indicators/Indicator-SarExt) |

## Volume

Price moves weighted or confirmed by traded volume. All take `Candle` input.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Obv`     | On-Balance Volume: cumulative signed volume. | `Candle` | `f64` | unbounded (drifts with volume) | (no parameters) | `1` | [Indicator-Obv](/Indicators/Indicator-Obv) |
| `Vwap`    | Cumulative volume-weighted average price from the stream start; a sibling `RollingVwap(period)` is exposed for a finite window. | `Candle` | `f64` | unbounded (price scale) | (no parameters) | `1` (cumulative); `period` (rolling) | [Indicator-Vwap](/Indicators/Indicator-Vwap) (cumulative + [rolling](/Indicators/Indicator-Vwap#rollingvwap-finite-window)) |
| `Adl`     | Accumulation/Distribution Line; cumulative range-weighted volume. | `Candle` | `f64` | unbounded (drifts with volume) | (no parameters) | `1` | [Indicator-Adl](/Indicators/Indicator-Adl) |
| `VolumePriceTrend` | Cumulative `volume · ROC`; volume weighted by percentage move. | `Candle` | `f64` | unbounded (drifts with volume) | (no parameters) | `1` | [Indicator-VolumePriceTrend](/Indicators/Indicator-VolumePriceTrend) |
| `ChaikinMoneyFlow` | Summed money-flow volume over summed volume across `period` bars. | `Candle` | `f64` | `[−1, +1]` | `period = 20` (Python) | `period` | [Indicator-ChaikinMoneyFlow](/Indicators/Indicator-ChaikinMoneyFlow) |
| `ChaikinOscillator` | `EMA(ADL, fast) − EMA(ADL, slow)`; the MACD of the ADL. | `Candle` | `f64` | unbounded around zero | `(fast=3, slow=10)` (Python) | `slow` | [Indicator-ChaikinOscillator](/Indicators/Indicator-ChaikinOscillator) |
| `ForceIndex` | `EMA((close − prev_close) · volume, period)`. | `Candle` | `f64` | unbounded around zero | `period = 13` (Python) | `period + 1` | [Indicator-ForceIndex](/Indicators/Indicator-ForceIndex) |
| `EaseOfMovement` | `SMA` of distance travelled per unit of volume. | `Candle` | `f64` | unbounded around zero | `(period=14, divisor=1e8)` (Python) | `period + 1` | [Indicator-EaseOfMovement](/Indicators/Indicator-EaseOfMovement) |
| `RollingVwap` | VWAP over a finite rolling window (vs the cumulative `Vwap`). | `Candle` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-RollingVwap](/Indicators/Indicator-RollingVwap) |
| `AnchoredVwap` | Cumulative VWAP from a user-set anchor bar (event-anchored fair price). | `Candle` | `f64` | unbounded (price scale) | (set anchor via `set_anchor()`) | `1` post-anchor | [Indicator-AnchoredVwap](/Indicators/Indicator-AnchoredVwap) |
| `AdOscillator` | Williams' Accumulation/Distribution — volume-less cumulative price flow. | `Candle` | `f64` | unbounded | (no parameters) | `2` | [Indicator-AdOscillator](/Indicators/Indicator-AdOscillator) |
| `Kvo` | Klinger Volume Oscillator — long/short EMAs of trend-aware volume force. | `Candle` | `(kvo, signal)` | unbounded around zero | `(34, 55, 13)` | `slow + signal − 1` | [Indicator-Kvo](/Indicators/Indicator-Kvo) |
| `VolumeOscillator` | `100·(SMA(vol,fast) − SMA(vol,slow))/SMA(vol,slow)`. | `Candle` | `f64` | unbounded above `−100` | `(fast=14, slow=28)` | `slow` | [Indicator-VolumeOscillator](/Indicators/Indicator-VolumeOscillator) |
| `Vzo` | Volume Zone Oscillator — `100·EMA(signed vol)/EMA(\|vol\|)`. | `Candle` | `f64` | `[−100, +100]` | `period = 14` | `period + 1` | [Indicator-Vzo](/Indicators/Indicator-Vzo) |
| `Tsv` | Time Segmented Volume — rolling sum of `(close-change · volume)`. | `Candle` | `f64` | unbounded around zero | `period = 18` | `period + 1` | [Indicator-Tsv](/Indicators/Indicator-Tsv) |
| `Nvi` | Negative Volume Index — cumulative; updates only on volume contraction. | `Candle` | `f64` | unbounded (anchored at 1000) | (no parameters) | `2` | [Indicator-Nvi](/Indicators/Indicator-Nvi) |
| `Pvi` | Positive Volume Index — mirror of NVI; updates only on volume expansion. | `Candle` | `f64` | unbounded (anchored at 1000) | (no parameters) | `2` | [Indicator-Pvi](/Indicators/Indicator-Pvi) |
| `DemandIndex` | Sibbet's EMA-smoothed buying-vs-selling pressure ratio. | `Candle` | `f64` | unbounded (typically `[-100, +100]`) | `period = 20` | `period + 1` | [Indicator-DemandIndex](/Indicators/Indicator-DemandIndex) |
| `MarketFacilitationIndex` | Williams' `(high − low) / volume` per-bar facilitation. | `Candle` | `f64` | `[0, ∞)` | (no parameters) | `1` | [Indicator-MarketFacilitationIndex](/Indicators/Indicator-MarketFacilitationIndex) |

## Price Statistics

Per-bar price transforms and rolling least-squares regressions.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `TypicalPrice`  | `(high + low + close) / 3`. | `Candle` | `f64` | unbounded (price scale) | (no parameters) | `1` | [Indicator-TypicalPrice](/Indicators/Indicator-TypicalPrice) |
| `MedianPrice`   | `(high + low) / 2`. | `Candle` | `f64` | unbounded (price scale) | (no parameters) | `1` | [Indicator-MedianPrice](/Indicators/Indicator-MedianPrice) |
| `WeightedClose` | `(high + low + 2·close) / 4`. | `Candle` | `f64` | unbounded (price scale) | (no parameters) | `1` | [Indicator-WeightedClose](/Indicators/Indicator-WeightedClose) |
| `LinearRegression` | Endpoint of the rolling least-squares line. | `f64` | `f64` | unbounded (price scale) | `period = 14` (Python) | `period` | [Indicator-LinearRegression](/Indicators/Indicator-LinearRegression) |
| `LinRegSlope`   | Slope of the rolling least-squares line. | `f64` | `f64` | unbounded around zero | `period = 14` (Python) | `period` | [Indicator-LinRegSlope](/Indicators/Indicator-LinRegSlope) |
| `ZScore`        | `(price − SMA(n)) / population_stddev(n)`. | `f64` | `f64` | unbounded around zero | `period = 20` (Python) | `period` | [Indicator-ZScore](/Indicators/Indicator-ZScore) |
| `LinRegAngle`   | The rolling regression slope as a degree angle. | `f64` | `f64` | `(−90°, +90°)` | `period = 14` (Python) | `period` | [Indicator-LinRegAngle](/Indicators/Indicator-LinRegAngle) |
| `Variance`      | Rolling population variance (second central moment). | `f64` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-Variance](/Indicators/Indicator-Variance) |
| `CoefficientOfVariation` | `StdDev / Mean` — dimensionless dispersion. | `f64` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-CoefficientOfVariation](/Indicators/Indicator-CoefficientOfVariation) |
| `Skewness`      | Rolling Pearson skewness (third standardised moment). | `f64` | `f64` | unbounded | `period` | `period` | [Indicator-Skewness](/Indicators/Indicator-Skewness) |
| `Kurtosis`      | Rolling excess kurtosis (fourth standardised moment − 3). | `f64` | `f64` | `[-2, ∞)` | `period` | `period` | [Indicator-Kurtosis](/Indicators/Indicator-Kurtosis) |
| `StandardError` | Standard error of the rolling OLS line; trend-detrended volatility. | `f64` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-StandardError](/Indicators/Indicator-StandardError) |
| `RSquared`      | R² of the rolling OLS fit; fraction of variance explained. | `f64` | `f64` | `[0, 1]` | `period` | `period` | [Indicator-RSquared](/Indicators/Indicator-RSquared) |
| `MedianAbsoluteDeviation` | Robust dispersion: `median(\|x − median\|)`. | `f64` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-MedianAbsoluteDeviation](/Indicators/Indicator-MedianAbsoluteDeviation) |
| `Autocorrelation` | Rolling lag-`k` Pearson autocorrelation. | `f64` | `f64` | `[-1, +1]` | `(period, lag)` | `period` | [Indicator-Autocorrelation](/Indicators/Indicator-Autocorrelation) |
| `HurstExponent` | Rescaled-range (R/S) Hurst exponent estimate. | `f64` | `f64` | typically `(0, 1)` | `(period, chunks)` | `period` | [Indicator-HurstExponent](/Indicators/Indicator-HurstExponent) |
| `PearsonCorrelation` | Rolling Pearson correlation of two synchronised series. | `(f64, f64)` | `f64` | `[-1, +1]` | `period` | `period` | [Indicator-PearsonCorrelation](/Indicators/Indicator-PearsonCorrelation) |
| `Beta`          | Rolling OLS sensitivity of asset to benchmark. | `(f64, f64)` | `f64` | unbounded | `period` | `period` | [Indicator-Beta](/Indicators/Indicator-Beta) |
| `PairwiseBeta`  | Rolling OLS slope of one asset's log-returns on another's. | `(f64, f64)` | `f64` | unbounded | `period` | `period + 1` | [Indicator-PairwiseBeta](/Indicators/Indicator-PairwiseBeta) |
| `PairSpreadZScore` | Z-score of the log-spread `ln(a) − β·ln(b)` of a pair. | `(f64, f64)` | `f64` | unbounded | `(beta_period, z_period)` | `beta_period + z_period − 1` | [Indicator-PairSpreadZScore](/Indicators/Indicator-PairSpreadZScore) |
| `LeadLagCrossCorrelation` | Offset that maximises `\|corr(a[t], b[t+k])\|` — which asset leads. | `(f64, f64)` | `{lag, correlation}` | `lag ∈ [−max_lag, max_lag]` | `(window, max_lag)` | `window + 2·max_lag` | [Indicator-LeadLagCrossCorrelation](/Indicators/Indicator-LeadLagCrossCorrelation) |
| `Cointegration` | Engle–Granger hedge ratio + ADF stationarity test on the spread. | `(f64, f64)` | `{hedge_ratio, spread, adf_stat}` | `adf_stat` unbounded | `(period, adf_lags)` | `period` | [Indicator-Cointegration](/Indicators/Indicator-Cointegration) |
| `RelativeStrengthAB` | Ratio line `a / b` with its moving average and RSI. | `(f64, f64)` | `{ratio, ratio_ma, ratio_rsi}` | `ratio_rsi ∈ [0, 100]` | `(ma_period, rsi_period)` | `max(ma_period, rsi_period + 1)` | [Indicator-RelativeStrengthAB](/Indicators/Indicator-RelativeStrengthAB) |
| `SpearmanCorrelation` | Rolling rank correlation; monotone-relationship robust. | `(f64, f64)` | `f64` | `[-1, +1]` | `period` | `period` | [Indicator-SpearmanCorrelation](/Indicators/Indicator-SpearmanCorrelation) |
| `AvgPrice` | Average Price; `(open + high + low + close) / 4`. | `Candle` | `f64` | price scale | none | `1` | [Indicator-AvgPrice](/Indicators/Indicator-AvgPrice) |
| `MidPrice` | `(highest high + lowest low) / 2` over `period` candles. | `Candle` | `f64` | price scale | `period` required | `period` | [Indicator-MidPrice](/Indicators/Indicator-MidPrice) |
| `MidPoint` | `(highest + lowest) / 2` of a scalar series over `period`. | `f64` | `f64` | price scale | `period` required | `period` | [Indicator-MidPoint](/Indicators/Indicator-MidPoint) |
| `LinRegIntercept` | Intercept `a` of the rolling OLS fit `y = a + b·x` (value at `x = 0`). | `f64` | `f64` | price scale | `period >= 2` | `period` | [Indicator-LinRegIntercept](/Indicators/Indicator-LinRegIntercept) |
| `Tsf` | Time Series Forecast; OLS line projected one bar ahead (`a + b·period`). | `f64` | `f64` | price scale | `period >= 2` | `period` | [Indicator-Tsf](/Indicators/Indicator-Tsf) |
| `LogReturn` | Logarithmic return over a fixed lag, `ln(p_t / p_{t−period})`. | `f64` | `f64` | unbounded | `period` | `period + 1` | [Indicator-LogReturn](/Indicators/Indicator-LogReturn) |
| `RealizedVolatility` | `√(Σ r²)` raw quadratic variation over `period` returns. | `f64` | `f64` | `[0, ∞)` | `period` | `period + 1` | [Indicator-RealizedVolatility](/Indicators/Indicator-RealizedVolatility) |
| `RollingQuantile` | Interpolated `q`-th quantile over `period` values (type-7). | `f64` | `f64` | within window | `(period, quantile)` | `period` | [Indicator-RollingQuantile](/Indicators/Indicator-RollingQuantile) |
| `RollingIqr` | Interquartile range `Q3 − Q1`; robust dispersion. | `f64` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-RollingIqr](/Indicators/Indicator-RollingIqr) |
| `RollingPercentileRank` | Percentile rank of the latest value within its window. | `f64` | `f64` | `[0, 100]` | `period` | `period` | [Indicator-RollingPercentileRank](/Indicators/Indicator-RollingPercentileRank) |
| `SpreadAr1Coefficient` | AR(1) coefficient `ρ` of the spread `a − b` (cointegration strength). | `(f64, f64)` | `f64` | `~[0, 1]` if stationary | `period >= 3` | `period` | [Indicator-SpreadAr1Coefficient](/Indicators/Indicator-SpreadAr1Coefficient) |
| `CloseVsOpen` | Signed body as a fraction of open, `(close − open)/open`. | `Candle` | `f64` | unbounded | (no parameters) | `1` | [Indicator-CloseVsOpen](/Indicators/Indicator-CloseVsOpen) |
| `BodySizePct` | Absolute body as a fraction of the bar range. | `Candle` | `f64` | `[0, 1]` | (no parameters) | `1` | [Indicator-BodySizePct](/Indicators/Indicator-BodySizePct) |
| `WickRatio` | Signed upper-vs-lower shadow imbalance over the range. | `Candle` | `f64` | `[−1, 1]` | (no parameters) | `1` | [Indicator-WickRatio](/Indicators/Indicator-WickRatio) |
| `HighLowRange` | Bar range as a fraction of close (scale-free volatility). | `Candle` | `f64` | `[0, ∞)` | (no parameters) | `1` | [Indicator-HighLowRange](/Indicators/Indicator-HighLowRange) |
| `OuHalfLife` | Ornstein–Uhlenbeck half-life of mean reversion of the spread `a − b`. | `(f64, f64)` | `f64` | `[0, ∞)`; `0` = no finite half-life | `period >= 3` | `period` | [Indicator-OuHalfLife](/Indicators/Indicator-OuHalfLife) |
| `GrangerCausality` | Rolling F-statistic: does `b` help predict `a`? | `(f64, f64)` | `f64` | `[0, ∞)` | `(period, lag)` | `period` | [Indicator-GrangerCausality](/Indicators/Indicator-GrangerCausality) |
| `KalmanHedgeRatio` | Dynamic hedge ratio between two series via an online Kalman filter. | `(f64, f64)` | `{hedge_ratio, intercept, spread}` | unbounded | `(delta, observation_var)` | `1` | [Indicator-KalmanHedgeRatio](/Indicators/Indicator-KalmanHedgeRatio) |
| `VarianceRatio` | Lo–MacKinlay variance ratio of the spread `a − b`. | `(f64, f64)` | `f64` | `[0, ∞)`; `1` = random walk | `(period, q)` | `period` | [Indicator-VarianceRatio](/Indicators/Indicator-VarianceRatio) |
| `RollingCorrelation` | Rolling Pearson correlation of the two series' returns. | `(f64, f64)` | `f64` | `[-1, +1]` | `period` | `period + 1` | [Indicator-RollingCorrelation](/Indicators/Indicator-RollingCorrelation) |
| `RollingCovariance` | Rolling covariance of the two series' returns. | `(f64, f64)` | `f64` | unbounded | `period` | `period + 1` | [Indicator-RollingCovariance](/Indicators/Indicator-RollingCovariance) |
| `SpreadHurst` | Hurst exponent of the spread `a − b` (pairs regime detection). | `(f64, f64)` | `f64` | `~[0, 1]` | `period >= 8` | `period` | [Indicator-SpreadHurst](/Indicators/Indicator-SpreadHurst) |
| `SpreadBollingerBands` | Bollinger bands on the spread `a − b` of two series. | `(f64, f64)` | `{middle, upper, lower, percent_b}` | bands in spread units | `(period, num_std)` | `period` | [Indicator-SpreadBollingerBands](/Indicators/Indicator-SpreadBollingerBands) |
| `BetaNeutralSpread` | Rolling OLS residual of `a` on `b` — the beta-neutral spread. | `(f64, f64)` | `f64` | unbounded | `period` | `period` | [Indicator-BetaNeutralSpread](/Indicators/Indicator-BetaNeutralSpread) |
| `DistanceSsd` | Gatev sum of squared deviations between two normalised series. | `(f64, f64)` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-DistanceSsd](/Indicators/Indicator-DistanceSsd) |

## Ehlers / Cycle (DSP)

John Ehlers' family of DSP cycle filters, phase-extraction tools, and
adaptive smoothers. All take `f64` price input.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Mama` | MESA Adaptive MA — adaptive alpha from Hilbert phase. | `f64` | `(mama, fama)` | unbounded (price scale) | `(0.5, 0.05)` | ~30 | [Indicator-Mama](/Indicators/Indicator-Mama) |
| `Fama` | Scalar wrapper exposing only MAMA's slow follower line. | `f64` | `f64` | unbounded (price scale) | `(0.5, 0.05)` | ~30 | [Indicator-Fama](/Indicators/Indicator-Fama) |
| `FisherTransform` | Min/max-normalises price + `0.5·ln((1+x)/(1-x))`. | `f64` | `f64` | unbounded; mostly `[-2, +2]` | `period` | `period` | [Indicator-FisherTransform](/Indicators/Indicator-FisherTransform) |
| `InverseFisherTransform` | `tanh(scale · input)`; bounded squash. | `f64` | `f64` | `[-1, +1]` | `scale` | `1` | [Indicator-InverseFisherTransform](/Indicators/Indicator-InverseFisherTransform) |
| `SuperSmoother` | Ehlers' 2-pole Butterworth lowpass filter. | `f64` | `f64` | unbounded (price scale) | `period` | `2` | [Indicator-SuperSmoother](/Indicators/Indicator-SuperSmoother) |
| `HilbertDominantCycle` | Truncated-Hilbert phase-derived dominant cycle period. | `f64` | `f64` | `[6, 50]` | (no parameters) | ~50 | [Indicator-HilbertDominantCycle](/Indicators/Indicator-HilbertDominantCycle) |
| `SineWave` | `sin(phase)` from Hilbert phase; pair with `lead()` for cross. | `f64` | `f64` | `[-1, +1]` | (no parameters) | ~50 | [Indicator-SineWave](/Indicators/Indicator-SineWave) |
| `Decycler` | `price − HighPass(price)` — low-lag trend extractor. | `f64` | `f64` | unbounded (price scale) | `period` | `2` | [Indicator-Decycler](/Indicators/Indicator-Decycler) |
| `DecyclerOscillator` | Difference of fast and slow `Decycler`s — MACD-shape. | `f64` | `f64` | unbounded around zero | `(fast, slow)` | `2` | [Indicator-DecyclerOscillator](/Indicators/Indicator-DecyclerOscillator) |
| `RoofingFilter` | High-pass + SuperSmoother = cycle-band bandpass. | `f64` | `f64` | unbounded around zero | `(lp, hp)` (default `10, 48`) | `2` | [Indicator-RoofingFilter](/Indicators/Indicator-RoofingFilter) |
| `CenterOfGravity` | Linear-weighted price barycenter, near-zero-lag. | `f64` | `f64` | unbounded around zero | `period` | `period` | [Indicator-CenterOfGravity](/Indicators/Indicator-CenterOfGravity) |
| `CyberneticCycle` | 4-tap pre-smoother + 2nd-order high-pass cycle extractor. | `f64` | `f64` | unbounded around zero | `period` | `6` | [Indicator-CyberneticCycle](/Indicators/Indicator-CyberneticCycle) |
| `AdaptiveCycle` | Half-period wrapper over `HilbertDominantCycle` for adaptive oscillators. | `f64` | `f64` | `[3, 25]` (integer) | (no parameters) | ~50 | [Indicator-AdaptiveCycle](/Indicators/Indicator-AdaptiveCycle) |
| `EmpiricalModeDecomposition` | Bandpass + envelope EMD; regime classifier. | `f64` | `f64` | unbounded around zero | `(period, fraction)` | `period` | [Indicator-EmpiricalModeDecomposition](/Indicators/Indicator-EmpiricalModeDecomposition) |
| `EhlersStochastic` | Stochastic on Roofing-Filter output (`[-1, +1]` scale). | `f64` | `f64` | `[-1, +1]` | `period` | `period + ~50` | [Indicator-EhlersStochastic](/Indicators/Indicator-EhlersStochastic) |
| `InstantaneousTrendline` | Near-zero-lag tuned recurrence — fast trend line. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-InstantaneousTrendline](/Indicators/Indicator-InstantaneousTrendline) |
| `HtPhasor` | Hilbert-transform in-phase / quadrature components of the analytic signal. | `f64` | `(inphase, quadrature)` | unbounded | none | `19` | [Indicator-HtPhasor](/Indicators/Indicator-HtPhasor) |
| `HtDcPhase` | Hilbert-transform dominant-cycle phase, in degrees. | `f64` | `f64` | bounded phase band (deg) | none | `50` | [Indicator-HtDcPhase](/Indicators/Indicator-HtDcPhase) |
| `HtTrendMode` | Ehlers' trend (`1`) vs cycle (`0`) classification. | `f64` | `f64` | `{0, 1}` | none | `50` | [Indicator-HtTrendMode](/Indicators/Indicator-HtTrendMode) |

## Pivots & S/R

Session-anchored pivot levels and swing detectors. Pivots take a single
(typically session-aggregated) candle and emit fixed S/R levels for the next
session; swing detectors run continuously and mark structural pivots.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `ClassicPivots` | Floor-trader pivots: `PP, R1-R3, S1-S3` from `(H+L+C)/3`. | `Candle` | 7 fields | unbounded (price scale) | (no parameters) | `1` | [Indicator-ClassicPivots](/Indicators/Indicator-ClassicPivots) |
| `FibonacciPivots` | Pivot + Fib-ratio R/S levels (`0.382 / 0.618 / 1.000 · range`). | `Candle` | 7 fields | unbounded (price scale) | (no parameters) | `1` | [Indicator-FibonacciPivots](/Indicators/Indicator-FibonacciPivots) |
| `Camarilla` | Stott's close-anchored 4-tier `±(1.1 · range / {12,6,4,2})`. | `Candle` | 9 fields | unbounded (price scale) | (no parameters) | `1` | [Indicator-Camarilla](/Indicators/Indicator-Camarilla) |
| `WoodiePivots` | Close-weighted pivot `(H+L+2C)/4` with 2-tier R/S. | `Candle` | 5 fields | unbounded (price scale) | (no parameters) | `1` | [Indicator-WoodiePivots](/Indicators/Indicator-WoodiePivots) |
| `DemarkPivots` | Open-conditional 1-tier pivot (different formula per bar direction). | `Candle` | `(pp, r1, s1)` | unbounded (price scale) | (no parameters) | `1` | [Indicator-DemarkPivots](/Indicators/Indicator-DemarkPivots) |
| `WilliamsFractals` | Bill Williams' 5-bar swing-high / swing-low detector. | `Candle` | `(up, down: Option<f64>)` | unbounded (price scale) | (no parameters) | `5` | [Indicator-WilliamsFractals](/Indicators/Indicator-WilliamsFractals) |
| `ZigZag` | Non-repainting percentage-threshold swing detector. | `Candle` | `(swing, direction)` | unbounded (price scale) | `threshold = 0.05` | `2` | [Indicator-ZigZag](/Indicators/Indicator-ZigZag) |

## DeMark

Tom DeMark's full setup / countdown / pivot family. All bar-direction-aware
oscillators, exhaustion detectors, and protective-stop levels.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `TdSetup` | 9-bar momentum-exhaustion setup count (signed). | `Candle` | `f64` | `[-target, +target]` | `(lookback=4, target=9)` | `lookback + 1` | [Indicator-TdSetup](/Indicators/Indicator-TdSetup) |
| `TdSequential` | Setup + Countdown 13 — canonical DeMark exhaustion. | `Candle` | `(setup, countdown)` | signed | `(4, 9, 2, 13)` | `max(4, 2) + 1` | [Indicator-TdSequential](/Indicators/Indicator-TdSequential) |
| `TdCountdown` | Standalone Countdown 13 (auto-detects setup internally). | `Candle` | `f64` | `[-13, +13]` | `(4, 9, 2, 13)` | `max(4, 2) + 1` | [Indicator-TdCountdown](/Indicators/Indicator-TdCountdown) |
| `TdCombo` | Stricter, faster countdown variant (3 strictness conditions). | `Candle` | `f64` | `[-13, +13]` | `(4, 9, 2, 13)` | `max(4, 2) + 1` | [Indicator-TdCombo](/Indicators/Indicator-TdCombo) |
| `TdLines` | TDST support/resistance — extremes of completed setups. | `Candle` | `(resistance, support)` | unbounded; NaN before first setup | `(4, 9)` | `lookback + 1` | [Indicator-TdLines](/Indicators/Indicator-TdLines) |
| `TdDeMarker` | High/low-extension based 0-1 momentum oscillator. | `Candle` | `f64` | `[0, 1]` | `period = 14` | `period + 1` | [Indicator-TdDeMarker](/Indicators/Indicator-TdDeMarker) |
| `TdRei` | Range Expansion Index — conditionally-weighted short oscillator. | `Candle` | `f64` | `[-100, +100]` | `period = 5` | `period + 7` | [Indicator-TdRei](/Indicators/Indicator-TdRei) |
| `TdPressure` | Volume-weighted DeMark pressure oscillator. | `Candle` | `f64` | `[-100, +100]` | `period = 5` | `period` | [Indicator-TdPressure](/Indicators/Indicator-TdPressure) |
| `TdRangeProjection` | Next-bar high/low projection from current bar OHLC. | `Candle` | `(high, low)` | unbounded (price scale) | (no parameters) | `1` | [Indicator-TdRangeProjection](/Indicators/Indicator-TdRangeProjection) |
| `TdDifferential` | 2-bar pressure-shift reversal pattern. | `Candle` | `f64` | `{-1, 0, +1}` | (no parameters) | `2` | [Indicator-TdDifferential](/Indicators/Indicator-TdDifferential) |
| `TdOpen` | Gap-and-fade reversal signal (open outside prior range). | `Candle` | `f64` | `{-1, 0, +1}` | (no parameters) | `2` | [Indicator-TdOpen](/Indicators/Indicator-TdOpen) |
| `TdRiskLevel` | Protective-stop level from setup extreme + true range. | `Candle` | `(buy_risk, sell_risk)` | unbounded; NaN before first setup | `(4, 9)` | `lookback + 1` | [Indicator-TdRiskLevel](/Indicators/Indicator-TdRiskLevel) |

## Ichimoku & Charts

Japanese cloud charting and candle-smoothing transforms.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Ichimoku` | Five-line cloud system (Tenkan, Kijun, Senkou A/B, Chikou). | `Candle` | 5 `Option<f64>` fields | unbounded (price scale) | `(9, 26, 52, 26)` | `senkou_b + displacement - 1` (77 at defaults) | [Indicator-Ichimoku](/Indicators/Indicator-Ichimoku) |
| `HeikinAshi` | "Average bar" candle-smoothing transform. | `Candle` | `(open, high, low, close)` | unbounded (price scale) | (no parameters) | `1` | [Indicator-HeikinAshi](/Indicators/Indicator-HeikinAshi) |

## Candlestick Patterns

Classical 1- / 2- / 3-bar candlestick pattern detectors. All take `Candle`
input and return a signed `f64` (`+1` bullish, `-1` bearish, `0` no signal)
unless noted. Pattern-shape checks only — combine with a trend filter for
actionable signals.

| Indicator | Pattern | Bars | Output | Defaults | Warmup | Deep dive |
|-----------|---------|------|--------|----------|--------|-----------|
| `Doji` | Indecision — body ≤ threshold·range. | 1 | `f64` (`0` or `+1`) | `body_threshold = 0.1` | `1` | [Indicator-Doji](/Indicators/Indicator-Doji) |
| `Hammer` | Small body top, long lower shadow ≥ 2·body. | 1 | `f64` (`0` or `+1`) | (no parameters) | `1` | [Indicator-Hammer](/Indicators/Indicator-Hammer) |
| `InvertedHammer` | Mirror of Hammer (long upper shadow). | 1 | `f64` (`0` or `+1`) | (no parameters) | `1` | [Indicator-InvertedHammer](/Indicators/Indicator-InvertedHammer) |
| `HangingMan` | Same shape as Hammer, bearish reading at top of uptrend. | 1 | `f64` (`0` or `-1`) | (no parameters) | `1` | [Indicator-HangingMan](/Indicators/Indicator-HangingMan) |
| `ShootingStar` | Same shape as Inverted Hammer, bearish reading at top. | 1 | `f64` (`0` or `-1`) | (no parameters) | `1` | [Indicator-ShootingStar](/Indicators/Indicator-ShootingStar) |
| `Marubozu` | Full-body candle with (near-)no shadows. | 1 | `f64` (`{-1, 0, +1}`) | `shadow_tolerance = 0.05` | `1` | [Indicator-Marubozu](/Indicators/Indicator-Marubozu) |
| `SpinningTop` | Small body, both shadows ≥ 2·body. | 1 | `f64` (`{-1, 0, +1}`) | `body_threshold = 0.3` | `1` | [Indicator-SpinningTop](/Indicators/Indicator-SpinningTop) |
| `Engulfing` | 2-bar full-body engulfing reversal. | 2 | `f64` (`{-1, 0, +1}`) | (no parameters) | `2` | [Indicator-Engulfing](/Indicators/Indicator-Engulfing) |
| `Harami` | 2-bar inside-body reversal (opposite of Engulfing). | 2 | `f64` (`{-1, 0, +1}`) | (no parameters) | `2` | [Indicator-Harami](/Indicators/Indicator-Harami) |
| `PiercingDarkCloud` | 2-bar gap-and-recover-past-midpoint reversal. | 2 | `f64` (`{-1, 0, +1}`) | (no parameters) | `2` | [Indicator-PiercingDarkCloud](/Indicators/Indicator-PiercingDarkCloud) |
| `Tweezer` | 2-bar matching-extreme reversal (Top / Bottom). | 2 | `f64` (`{-1, 0, +1}`) | `tolerance = 0.001` | `2` | [Indicator-Tweezer](/Indicators/Indicator-Tweezer) |
| `MorningEveningStar` | 3-bar reversal: long bar + star + opposite long bar. | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-MorningEveningStar](/Indicators/Indicator-MorningEveningStar) |
| `ThreeSoldiersOrCrows` | 3-bar continuation: three rising / falling long bars. | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-ThreeSoldiersOrCrows](/Indicators/Indicator-ThreeSoldiersOrCrows) |
| `ThreeInside` | Confirmed Harami: Harami + close past Bar 1 body. | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-ThreeInside](/Indicators/Indicator-ThreeInside) |
| `ThreeOutside` | Confirmed Engulfing: Engulfing + close past Bar 2 close. | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-ThreeOutside](/Indicators/Indicator-ThreeOutside) |
| `TwoCrows` | 3-bar bearish reversal after an advance. | 3 | `f64` (`0` or `-1`) | (no parameters) | `3` | [Indicator-TwoCrows](/Indicators/Indicator-TwoCrows) |
| `UpsideGapTwoCrows` | Two crows holding an upside gap (bearish). | 3 | `f64` (`0` or `-1`) | (no parameters) | `3` | [Indicator-UpsideGapTwoCrows](/Indicators/Indicator-UpsideGapTwoCrows) |
| `IdenticalThreeCrows` | Three blacks opening at the prior close, lower closes. | 3 | `f64` (`0` or `-1`) | tolerance = 0.001 | `3` | [Indicator-IdenticalThreeCrows](/Indicators/Indicator-IdenticalThreeCrows) |
| `ThreeLineStrike` | Three-bar run struck by an opposite 4th bar. | 4 | `f64` (`{-1, 0, +1}`) | (no parameters) | `4` | [Indicator-ThreeLineStrike](/Indicators/Indicator-ThreeLineStrike) |
| `ThreeStarsInSouth` | Three shrinking blacks, rising lows (rare bottom). | 3 | `f64` (`0` or `+1`) | tolerance = 0.001 | `3` | [Indicator-ThreeStarsInSouth](/Indicators/Indicator-ThreeStarsInSouth) |
| `AbandonedBaby` | Doji isolated by gaps both sides (island reversal). | 3 | `f64` (`{-1, 0, +1}`) | tolerance = 0.001 | `3` | [Indicator-AbandonedBaby](/Indicators/Indicator-AbandonedBaby) |
| `AdvanceBlock` | Three rising whites, shrinking bodies / rising wicks. | 3 | `f64` (`0` or `-1`) | (no parameters) | `3` | [Indicator-AdvanceBlock](/Indicators/Indicator-AdvanceBlock) |
| `BeltHold` | Long body opening at one extreme (opening marubozu). | 1 | `f64` (`{-1, 0, +1}`) | shadow_tolerance = 0.05 | `1` | [Indicator-BeltHold](/Indicators/Indicator-BeltHold) |
| `Breakaway` | 5-bar reversal fading a gapped over-extended run. | 5 | `f64` (`{-1, 0, +1}`) | (no parameters) | `5` | [Indicator-Breakaway](/Indicators/Indicator-Breakaway) |
| `Counterattack` | 2-bar reversal closing back at the prior close. | 2 | `f64` (`{-1, 0, +1}`) | equal_tolerance = 0.05 | `2` | [Indicator-Counterattack](/Indicators/Indicator-Counterattack) |
| `DojiStar` | Long body then a gapped doji (reversal warning). | 2 | `f64` (`{-1, 0, +1}`) | (no parameters) | `2` | [Indicator-DojiStar](/Indicators/Indicator-DojiStar) |
| `DragonflyDoji` | Doji at the top, long lower shadow (bullish). | 1 | `f64` (`0` or `+1`) | (no parameters) | `1` | [Indicator-DragonflyDoji](/Indicators/Indicator-DragonflyDoji) |
| `GravestoneDoji` | Doji at the bottom, long upper shadow (bearish). | 1 | `f64` (`0` or `-1`) | (no parameters) | `1` | [Indicator-GravestoneDoji](/Indicators/Indicator-GravestoneDoji) |
| `LongLeggedDoji` | Doji with long shadows both sides (indecision). | 1 | `f64` (`0` or `+1`) | (no parameters) | `1` | [Indicator-LongLeggedDoji](/Indicators/Indicator-LongLeggedDoji) |
| `RickshawMan` | Centred long-legged doji (balanced indecision). | 1 | `f64` (`0` or `+1`) | (no parameters) | `1` | [Indicator-RickshawMan](/Indicators/Indicator-RickshawMan) |
| `EveningDojiStar` | 3-bar bearish top: white, gapped doji, deep black. | 3 | `f64` (`0` or `-1`) | penetration = 0.3 | `3` | [Indicator-EveningDojiStar](/Indicators/Indicator-EveningDojiStar) |
| `MorningDojiStar` | 3-bar bullish bottom: black, gapped doji, deep white. | 3 | `f64` (`0` or `+1`) | penetration = 0.3 | `3` | [Indicator-MorningDojiStar](/Indicators/Indicator-MorningDojiStar) |
| `GapSideBySideWhite` | Two side-by-side whites holding a gap (continuation). | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-GapSideBySideWhite](/Indicators/Indicator-GapSideBySideWhite) |
| `HighWave` | Small body, very long shadows both sides (indecision). | 1 | `f64` (`0` or `+1`) | (no parameters) | `1` | [Indicator-HighWave](/Indicators/Indicator-HighWave) |
| `Hikkake` | Inside-bar false-breakout trap. | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-Hikkake](/Indicators/Indicator-Hikkake) |
| `HikkakeModified` | Close-confirmed Hikkake trap. | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-HikkakeModified](/Indicators/Indicator-HikkakeModified) |
| `HomingPigeon` | Same-colour harami in a decline (bullish). | 2 | `f64` (`0` or `+1`) | (no parameters) | `2` | [Indicator-HomingPigeon](/Indicators/Indicator-HomingPigeon) |
| `OnNeck` | Weak bounce to the prior low (bearish continuation). | 2 | `f64` (`0` or `-1`) | (no parameters) | `2` | [Indicator-OnNeck](/Indicators/Indicator-OnNeck) |
| `InNeck` | Bounce just into the body (bearish continuation). | 2 | `f64` (`0` or `-1`) | (no parameters) | `2` | [Indicator-InNeck](/Indicators/Indicator-InNeck) |
| `Thrusting` | Bounce toward mid-body, not past (bearish continuation). | 2 | `f64` (`0` or `-1`) | (no parameters) | `2` | [Indicator-Thrusting](/Indicators/Indicator-Thrusting) |
| `SeparatingLines` | Opposite candle reopening at the prior open (continuation). | 2 | `f64` (`{-1, 0, +1}`) | (no parameters) | `2` | [Indicator-SeparatingLines](/Indicators/Indicator-SeparatingLines) |
| `Kicking` | Two gapped opposite marubozu (violent reversal). | 2 | `f64` (`{-1, 0, +1}`) | (no parameters) | `2` | [Indicator-Kicking](/Indicators/Indicator-Kicking) |
| `KickingByLength` | Kicking signed by the longer marubozu. | 2 | `f64` (`{-1, 0, +1}`) | (no parameters) | `2` | [Indicator-KickingByLength](/Indicators/Indicator-KickingByLength) |
| `LadderBottom` | 5-bar bullish reversal after a stepped decline. | 5 | `f64` (`0` or `+1`) | (no parameters) | `5` | [Indicator-LadderBottom](/Indicators/Indicator-LadderBottom) |
| `MatHold` | 5-bar bullish continuation; shallow gapped rest. | 5 | `f64` (`0` or `+1`) | penetration = 0.5 | `5` | [Indicator-MatHold](/Indicators/Indicator-MatHold) |
| `MatchingLow` | Two black closes at the same low (support floor). | 2 | `f64` (`0` or `+1`) | (no parameters) | `2` | [Indicator-MatchingLow](/Indicators/Indicator-MatchingLow) |
| `LongLine` | Range longer than the recent average, body-dominant. | 5 | `f64` (`{-1, 0, +1}`) | period = 5 | `5` | [Indicator-LongLine](/Indicators/Indicator-LongLine) |
| `ShortLine` | Range shorter than the recent average, body-dominant. | 5 | `f64` (`{-1, 0, +1}`) | period = 5 | `5` | [Indicator-ShortLine](/Indicators/Indicator-ShortLine) |
| `RisingThreeMethods` | 5-bar bullish continuation; in-range rest. | 5 | `f64` (`0` or `+1`) | (no parameters) | `5` | [Indicator-RisingThreeMethods](/Indicators/Indicator-RisingThreeMethods) |
| `FallingThreeMethods` | 5-bar bearish continuation; in-range rest. | 5 | `f64` (`0` or `-1`) | (no parameters) | `5` | [Indicator-FallingThreeMethods](/Indicators/Indicator-FallingThreeMethods) |
| `UpsideGapThreeMethods` | Two whites gap up, black partly fills (continuation). | 3 | `f64` (`0` or `+1`) | (no parameters) | `3` | [Indicator-UpsideGapThreeMethods](/Indicators/Indicator-UpsideGapThreeMethods) |
| `DownsideGapThreeMethods` | Two blacks gap down, white partly fills (continuation). | 3 | `f64` (`0` or `-1`) | (no parameters) | `3` | [Indicator-DownsideGapThreeMethods](/Indicators/Indicator-DownsideGapThreeMethods) |
| `StalledPattern` | Two long whites then a small one on the shoulder (bearish). | 3 | `f64` (`0` or `-1`) | (no parameters) | `3` | [Indicator-StalledPattern](/Indicators/Indicator-StalledPattern) |
| `StickSandwich` | Two black closes sandwiching a white (support). | 3 | `f64` (`0` or `+1`) | (no parameters) | `3` | [Indicator-StickSandwich](/Indicators/Indicator-StickSandwich) |
| `Takuri` | Strict dragonfly doji, very long lower shadow. | 1 | `f64` (`0` or `+1`) | (no parameters) | `1` | [Indicator-Takuri](/Indicators/Indicator-Takuri) |
| `ClosingMarubozu` | Long body, no shadow on the close end. | 1 | `f64` (`{-1, 0, +1}`) | (no parameters) | `1` | [Indicator-ClosingMarubozu](/Indicators/Indicator-ClosingMarubozu) |
| `OpeningMarubozu` | Long body, no shadow on the open end. | 1 | `f64` (`{-1, 0, +1}`) | (no parameters) | `1` | [Indicator-OpeningMarubozu](/Indicators/Indicator-OpeningMarubozu) |
| `TasukiGap` | Counter candle into a gap that holds (continuation). | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-TasukiGap](/Indicators/Indicator-TasukiGap) |
| `UniqueThreeRiver` | Black, new-low black inside, small white (bottom). | 3 | `f64` (`0` or `+1`) | (no parameters) | `3` | [Indicator-UniqueThreeRiver](/Indicators/Indicator-UniqueThreeRiver) |
| `ConcealingBabySwallow` | Rare 4-bar capitulation; black run then engulf. | 4 | `f64` (`0` or `+1`) | (no parameters) | `4` | [Indicator-ConcealingBabySwallow](/Indicators/Indicator-ConcealingBabySwallow) |

## Market Profile

Session-anchored value-area / opening-range / initial-balance indicators.
All require manual `reset()` at session boundaries.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `ValueArea` | Rolling Market Profile: POC + VAH + VAL via volume bins. | `Candle` | `(poc, vah, val)` | unbounded (price scale) | `(period, bin_count, value_area_pct)` | `period` | [Indicator-ValueArea](/Indicators/Indicator-ValueArea) |
| `VolumeProfile` | Full per-bin volume histogram over a rolling window. | `Candle` | `(price_low, price_high, bins)` | `bins ≥ 0` | `(period=20, bin_count=50)` | `period` | [Indicator-VolumeProfile](/Indicators/Indicator-VolumeProfile) |
| `TpoProfile` | Time-Price-Opportunity (letter) count per price bucket. | `Candle` | `(price_low, price_high, counts)` | `counts ≥ 0` | `(period=30, bin_count=50)` | `period` | [Indicator-TpoProfile](/Indicators/Indicator-TpoProfile) |
| `InitialBalance` | First-N-bar session range, locked after warmup. | `Candle` | `(high, low)` | unbounded (price scale) | `period = 12` | `period` | [Indicator-InitialBalance](/Indicators/Indicator-InitialBalance) |
| `OpeningRange` | Locked first-N range + live breakout-distance from midpoint. | `Candle` | `(high, low, breakout_distance)` | unbounded (price scale) | `period = 6` | `period` | [Indicator-OpeningRange](/Indicators/Indicator-OpeningRange) |

## Risk / Performance

Risk-adjusted return ratios, drawdown analytics, and tail-risk measures.
Single-stream metrics take `f64` returns / equity; benchmark-relative metrics
take `(asset, benchmark)` pairs.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `SharpeRatio` | `(mean - rf) / sample_stddev` rolling. | `f64` | `f64` | unbounded | `(period, rf)` | `period` | [Indicator-SharpeRatio](/Indicators/Indicator-SharpeRatio) |
| `SortinoRatio` | Sharpe with downside-only deviation. | `f64` | `f64` | unbounded | `(period, mar)` | `period` | [Indicator-SortinoRatio](/Indicators/Indicator-SortinoRatio) |
| `CalmarRatio` | `mean(returns) / max_drawdown(equity)` from window. | `f64` | `f64` | unbounded; `0` if no DD | `period` | `period` | [Indicator-CalmarRatio](/Indicators/Indicator-CalmarRatio) |
| `OmegaRatio` | `Σ gains-above-threshold / Σ losses-below`. | `f64` | `f64` | `[0, ∞)` (`Inf` if all-positive) | `(period, threshold)` | `period` | [Indicator-OmegaRatio](/Indicators/Indicator-OmegaRatio) |
| `MaxDrawdown` | Rolling worst peak-to-trough decline. | `f64` (equity) | `f64` | `[0, 1]` | `period` | `1` | [Indicator-MaxDrawdown](/Indicators/Indicator-MaxDrawdown) |
| `AverageDrawdown` | Rolling mean drawdown depth (same as PainIndex). | `f64` (equity) | `f64` | `[0, 1]` | `period` | `period` | [Indicator-AverageDrawdown](/Indicators/Indicator-AverageDrawdown) |
| `DrawdownDuration` | Bars elapsed since all-time peak. | `f64` (equity) | `u32` | `[0, ∞)` | (no parameters) | `1` | [Indicator-DrawdownDuration](/Indicators/Indicator-DrawdownDuration) |
| `PainIndex` | Mean drawdown depth (Becker). | `f64` (equity) | `f64` | `[0, 1]` | `period` | `period` | [Indicator-PainIndex](/Indicators/Indicator-PainIndex) |
| `ValueAtRisk` | Historical lower-tail quantile, sign-flipped. | `f64` | `f64` | `[0, ∞)` | `(period, confidence)` | `period` | [Indicator-ValueAtRisk](/Indicators/Indicator-ValueAtRisk) |
| `ConditionalValueAtRisk` | Mean of returns beyond VaR (Expected Shortfall). | `f64` | `f64` | `[0, ∞)` | `(period, confidence)` | `period` | [Indicator-ConditionalValueAtRisk](/Indicators/Indicator-ConditionalValueAtRisk) |
| `ProfitFactor` | `Σ positive / Σ \|negative\|` over window. | `f64` | `f64` | `[0, ∞)` (`Inf` if all-positive) | `period` | `period` | [Indicator-ProfitFactor](/Indicators/Indicator-ProfitFactor) |
| `GainLossRatio` | `mean(wins) / mean(\|losses\|)`. | `f64` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-GainLossRatio](/Indicators/Indicator-GainLossRatio) |
| `RecoveryFactor` | Cumulative `net_return / max_drawdown`. | `f64` (equity) | `f64` | unbounded; `0` if no DD | (no parameters) | `1` | [Indicator-RecoveryFactor](/Indicators/Indicator-RecoveryFactor) |
| `KellyCriterion` | Rolling Kelly fraction `winrate − (1−winrate)/payoff_ratio`. | `f64` | `f64` | unbounded; typically `(0, 1)` | `period` | `period` | [Indicator-KellyCriterion](/Indicators/Indicator-KellyCriterion) |
| `TreynorRatio` | `(mean_asset − rf) / Beta`. | `(f64, f64)` | `f64` | unbounded | `(period, rf)` | `period` | [Indicator-TreynorRatio](/Indicators/Indicator-TreynorRatio) |
| `InformationRatio` | `mean(active) / tracking_error`. | `(f64, f64)` | `f64` | unbounded | `period` | `period` | [Indicator-InformationRatio](/Indicators/Indicator-InformationRatio) |
| `Alpha` | Jensen's alpha — `mean(asset) − (rf + Beta·(mean_bench − rf))`. | `(f64, f64)` | `f64` | unbounded | `(period, rf)` | `period` | [Indicator-Alpha](/Indicators/Indicator-Alpha) |
| `WinRate` | Fraction of strictly-positive returns over `period`. | `f64` | `f64` | `[0, 1]` | `period` | `period` | [Indicator-WinRate](/Indicators/Indicator-WinRate) |
| `Expectancy` | Expected return per unit of average loss (R-multiple). | `f64` | `f64` | unbounded | `period` | `period` | [Indicator-Expectancy](/Indicators/Indicator-Expectancy) |

## Microstructure

Non-OHLCV analytics over the order book and the trade tape. Order-book
indicators take an `OrderBook` depth snapshot; trade-flow indicators take a
`Trade` (size + aggressor side); price-impact measures take a `TradeQuote` (a
trade paired with the mid at execution); `Footprint` returns a variable-length
per-bucket profile. The Python and Node bindings accept these as plain arrays
(see each deep dive); WASM exposes per-event `update`.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `OrderBookImbalanceTop1` | Signed depth pressure at the touch. | `OrderBook` | `f64` | `[−1, 1]` | (no parameters) | `1` | [Indicator-OrderBookImbalanceTop1](/Indicators/Indicator-OrderBookImbalanceTop1) |
| `OrderBookImbalanceTopN` | Signed depth pressure over the top `levels`. | `OrderBook` | `f64` | `[−1, 1]` | `levels` | `1` | [Indicator-OrderBookImbalanceTopN](/Indicators/Indicator-OrderBookImbalanceTopN) |
| `OrderBookImbalanceFull` | Signed depth pressure over the whole book. | `OrderBook` | `f64` | `[−1, 1]` | (no parameters) | `1` | [Indicator-OrderBookImbalanceFull](/Indicators/Indicator-OrderBookImbalanceFull) |
| `Microprice` | Size-weighted fair value tilting the mid. | `OrderBook` | `f64` | within spread | (no parameters) | `1` | [Indicator-Microprice](/Indicators/Indicator-Microprice) |
| `QuotedSpread` | Top-of-book spread in bps of the mid. | `OrderBook` | `f64` | `≥ 0` | (no parameters) | `1` | [Indicator-QuotedSpread](/Indicators/Indicator-QuotedSpread) |
| `DepthSlope` | Mean per-side OLS slope of cumulative size vs distance. | `OrderBook` | `f64` | `≥ 0` | (no parameters) | `1` | [Indicator-DepthSlope](/Indicators/Indicator-DepthSlope) |
| `SignedVolume` | Trade size signed by aggressor (`±size`). | `Trade` | `f64` | unbounded | (no parameters) | `1` | [Indicator-SignedVolume](/Indicators/Indicator-SignedVolume) |
| `CumulativeVolumeDelta` | Running sum of signed volume. | `Trade` | `f64` | unbounded | (no parameters) | `1` | [Indicator-CumulativeVolumeDelta](/Indicators/Indicator-CumulativeVolumeDelta) |
| `TradeImbalance` | Rolling `(buy − sell)/(buy + sell)` over `window` trades. | `Trade` | `f64` | `[−1, 1]` | `window` | `window` | [Indicator-TradeImbalance](/Indicators/Indicator-TradeImbalance) |
| `EffectiveSpread` | `2·D·(price − mid)/mid·1e4` bps round-trip cost. | `TradeQuote` | `f64` | unbounded | (no parameters) | `1` | [Indicator-EffectiveSpread](/Indicators/Indicator-EffectiveSpread) |
| `RealizedSpread` | Effective spread net of impact over `horizon`. | `TradeQuote` | `f64` | unbounded | `horizon` | `horizon + 1` | [Indicator-RealizedSpread](/Indicators/Indicator-RealizedSpread) |
| `KylesLambda` | Rolling OLS price impact per unit signed volume. | `TradeQuote` | `f64` | unbounded | `window` | `window + 1` | [Indicator-KylesLambda](/Indicators/Indicator-KylesLambda) |
| `Footprint` | Buy/sell volume profile per price bucket. | `Trade` | `FootprintOutput` | per-bucket `≥ 0` | `tick_size` | `1` | [Indicator-Footprint](/Indicators/Indicator-Footprint) |
| `OrderFlowImbalance` | Rolling sum of best-level order-flow events (Cont-Kukanov-Stoikov OFI). | `OrderBook` | `f64` | unbounded | `period` | `period + 1` | [Indicator-OrderFlowImbalance](/Indicators/Indicator-OrderFlowImbalance) |
| `Vpin` | Volume-bucketed order-flow toxicity (informed trading). | `Trade` | `f64` | `[0, 1]` | `(bucket_volume, num_buckets)` | `num_buckets` | [Indicator-Vpin](/Indicators/Indicator-Vpin) |
| `AmihudIlliquidity` | Mean `\|return\| / traded value`; price-impact liquidity proxy. | `Trade` | `f64` | `[0, ∞)` | `period` | `period + 1` | [Indicator-AmihudIlliquidity](/Indicators/Indicator-AmihudIlliquidity) |
| `RollMeasure` | Effective spread from the serial covariance of price changes. | `Trade` | `f64` | `[0, ∞)` | `period >= 3` | `period + 1` | [Indicator-RollMeasure](/Indicators/Indicator-RollMeasure) |

## Derivatives

Perpetual- and dated-futures analytics over a `DerivativesTick` — a single feed
bundling funding rate, mark / index / futures price, open interest,
positioning, taker flow and liquidations. Each indicator reads only the fields
it needs; the Python and Node bindings expose just those fields per `update`
(see each deep dive), and `batch` takes equal-length arrays. WASM exposes
per-tick `update`.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `FundingRate` | The current perpetual funding rate. | `DerivativesTick` | `f64` | unbounded (may be negative) | (no parameters) | `1` | [Indicator-FundingRate](/Indicators/Indicator-FundingRate) |
| `FundingRateMean` | Rolling mean funding rate over `window`. | `DerivativesTick` | `f64` | unbounded | `window` | `window` | [Indicator-FundingRateMean](/Indicators/Indicator-FundingRateMean) |
| `FundingRateZScore` | Funding rate in stddevs from its rolling mean. | `DerivativesTick` | `f64` | unbounded around zero | `window` | `window` | [Indicator-FundingRateZScore](/Indicators/Indicator-FundingRateZScore) |
| `FundingBasis` | Perp premium to spot `(mark − index)/index`. | `DerivativesTick` | `f64` | unbounded around zero | (no parameters) | `1` | [Indicator-FundingBasis](/Indicators/Indicator-FundingBasis) |
| `OpenInterestDelta` | Tick-over-tick change in open interest. | `DerivativesTick` | `f64` | unbounded around zero | (no parameters) | `2` | [Indicator-OpenInterestDelta](/Indicators/Indicator-OpenInterestDelta) |
| `OIPriceDivergence` | Relative OI change minus relative price change over `window`. | `DerivativesTick` | `f64` | unbounded around zero | `window` | `window + 1` | [Indicator-OIPriceDivergence](/Indicators/Indicator-OIPriceDivergence) |
| `OIWeighted` | Cumulative OI-weighted mark price. | `DerivativesTick` | `f64` | unbounded (price scale) | (no parameters) | `1` | [Indicator-OIWeighted](/Indicators/Indicator-OIWeighted) |
| `LongShortRatio` | Aggregate long size over short size. | `DerivativesTick` | `f64` | `≥ 0` (`0` if no shorts) | (no parameters) | `1` | [Indicator-LongShortRatio](/Indicators/Indicator-LongShortRatio) |
| `TakerBuySellRatio` | Taker buy volume over taker sell volume. | `DerivativesTick` | `f64` | `≥ 0` (`0` if no sells) | (no parameters) | `1` | [Indicator-TakerBuySellRatio](/Indicators/Indicator-TakerBuySellRatio) |
| `LiquidationFeatures` | Long/short liquidation → net / total / imbalance. | `DerivativesTick` | `LiquidationFeaturesOutput` | `imbalance ∈ [−1, 1]` | (no parameters) | `1` | [Indicator-LiquidationFeatures](/Indicators/Indicator-LiquidationFeatures) |
| `TermStructureBasis` | Dated-future premium to spot `(futures − index)/index`. | `DerivativesTick` | `f64` | unbounded around zero | (no parameters) | `1` | [Indicator-TermStructureBasis](/Indicators/Indicator-TermStructureBasis) |
| `CalendarSpread` | Dated-future premium to the perpetual `(futures − mark)/mark`. | `DerivativesTick` | `f64` | unbounded around zero | (no parameters) | `1` | [Indicator-CalendarSpread](/Indicators/Indicator-CalendarSpread) |

## Pick the right indicator for…

A short cheat-sheet of "I want X, which indicator?" answers, grounded in
what each indicator actually computes.

- **Fast trend filter, minimal lag.** `Hma` for smoothness + responsiveness,
  `Tema` for further lag reduction at the cost of noise, `Kama` for
  adaptiveness instead of fixed lag.
- **Slow trend filter.** `Sma` is the simplest; `Ema` responds slightly
  faster with the same smoothness budget.
- **Trend-following crossovers.** Two-line crossovers are the textbook entry;
  `MacdIndicator` packages the idea with a signal line and histogram.
- **Trend strength — is there a trend at all?** `Adx` (`> 25` trending,
  `< 20` ranging); `ChoppinessIndex` / `VerticalHorizontalFilter` answer the
  same question without a direction.
- **Overbought / oversold.** `Rsi` is the default; `Stochastic` for faster
  signals; `WilliamsR` for an inverted scale; `Mfi` for a volume-aware RSI.
- **Volatility level vs. momentum.** `Atr` / `TrueRange` for the level;
  `ChaikinVolatility` for whether ranges are expanding or contracting.
- **Breakout level.** `Donchian` upper/lower bands are the Turtle-style
  trigger.
- **Trailing stop.** `Psar`, `SuperTrend`, `ChandelierExit`,
  `ChandeKrollStop` and `AtrTrailingStop` are a whole family of them.
- **Volume confirmation.** `Obv` is the simplest; `ChaikinMoneyFlow` is a
  bounded balance; `Vwap` / `RollingVwap` give a volume-weighted reference.
- **Mean reversion.** `ZScore` flags statistically stretched prices;
  `BollingerBandwidth` / `PercentB` locate price within the bands.

## Source-of-truth files

Every claim above can be checked against the source in
[`crates/wickra-core/src/indicators/`](https://github.com/wickra-lib/wickra/tree/main/crates/wickra-core/src/indicators)
— one file per indicator. The Rust unit tests inside each module are the
ground truth for sample values. Python defaults (the `period = 14` etc.) come
from the `#[pyo3(signature = …)]` attributes in
[`bindings/python/src/lib.rs`](https://github.com/wickra-lib/wickra/blob/main/bindings/python/src/lib.rs);
indicators without a Python default require an explicit argument.

## Alt-Chart Bars

Price-driven chart constructors built on the `BarBuilder` trait (not `Indicator`):
each consumes a candle stream and emits a variable number of completed bars per
candle. They are close-driven and not `Chain`-able.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `RenkoBars` | Fixed box-size bricks with the two-box reversal rule. | `Candle` | `Vec<RenkoBrick>` | n/a | `box_size` | seeds on 1st candle | [Indicator-RenkoBars](/Indicators/Indicator-RenkoBars) |
| `KagiBars` | Reversal-amount line segments. | `Candle` | `Vec<KagiBar>` | n/a | `reversal` | seeds on 1st candle | [Indicator-KagiBars](/Indicators/Indicator-KagiBars) |
| `PointAndFigureBars` | Box-size X/O columns with an N-box reversal. | `Candle` | `Vec<PnfColumn>` | n/a | `(box_size, reversal=3)` | seeds on 1st candle | [Indicator-PointAndFigureBars](/Indicators/Indicator-PointAndFigureBars) |

## Market Breadth

Universe-wide breadth indicators built on the `CrossSection` input — one tick
carrying the per-symbol state of the whole universe (each member has a signed
`change`, a `volume`, and `new_high` / `new_low` flags). They aggregate the
cross-section into a single participation reading.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `AbsoluteBreadthIndex` | Absolute value of net advancing-minus-declining issues. | `CrossSection` | `f64` | `0..=N` | none | 1 | [Indicator-AbsoluteBreadthIndex](/Indicators/Indicator-AbsoluteBreadthIndex) |
| `AdvanceDecline` | Cumulative net advancing-minus-declining issues. | `CrossSection` | `f64` | unbounded | none | 1 | [Indicator-AdvanceDecline](/Indicators/Indicator-AdvanceDecline) |
| `AdvanceDeclineRatio` | Advancing issues divided by declining issues. | `CrossSection` | `f64` | `0..` | none | 1 | [Indicator-AdvanceDeclineRatio](/Indicators/Indicator-AdvanceDeclineRatio) |
| `AdVolumeLine` | Cumulative net advancing-minus-declining volume. | `CrossSection` | `f64` | unbounded | none | 1 | [Indicator-AdVolumeLine](/Indicators/Indicator-AdVolumeLine) |
| `BreadthThrust` | Moving average of the advancing-issues share (Zweig). | `CrossSection` | `f64` | `0..=1` | `period=10` | 10 | [Indicator-BreadthThrust](/Indicators/Indicator-BreadthThrust) |
| `BullishPercentIndex` | Percentage of the universe on a point-and-figure buy signal. | `CrossSection` | `f64` | `0..=100` | none | 1 | [Indicator-BullishPercentIndex](/Indicators/Indicator-BullishPercentIndex) |
| `CumulativeVolumeIndex` | Running total of volume-normalised net advancing volume. | `CrossSection` | `f64` | unbounded | none | 1 | [Indicator-CumulativeVolumeIndex](/Indicators/Indicator-CumulativeVolumeIndex) |
| `HighLowIndex` | Moving average of the record-high percentage. | `CrossSection` | `f64` | `0..=100` | `period=10` | 10 | [Indicator-HighLowIndex](/Indicators/Indicator-HighLowIndex) |
| `McClellanOscillator` | Spread between a 19/39-period EMA of ratio-adjusted net advances. | `CrossSection` | `f64` | unbounded | none | 1 | [Indicator-McClellanOscillator](/Indicators/Indicator-McClellanOscillator) |
| `McClellanSummationIndex` | Running cumulative total of the McClellan Oscillator. | `CrossSection` | `f64` | unbounded | none | 1 | [Indicator-McClellanSummationIndex](/Indicators/Indicator-McClellanSummationIndex) |
| `NewHighsNewLows` | Net count of new period highs minus new period lows. | `CrossSection` | `f64` | `-N..=N` | none | 1 | [Indicator-NewHighsNewLows](/Indicators/Indicator-NewHighsNewLows) |
| `PercentAboveMa` | Percentage of the universe trading above its reference moving average. | `CrossSection` | `f64` | `0..=100` | none | 1 | [Indicator-PercentAboveMa](/Indicators/Indicator-PercentAboveMa) |
| `TickIndex` | Instantaneous net advancing-minus-declining issues. | `CrossSection` | `f64` | `-N..=N` | none | 1 | [Indicator-TickIndex](/Indicators/Indicator-TickIndex) |
| `Trin` | Advance-decline ratio over the up-down volume ratio (Arms Index). | `CrossSection` | `f64` | `0..` | none | 1 | [Indicator-Trin](/Indicators/Indicator-Trin) |
| `UpDownVolumeRatio` | Advancing volume divided by declining volume. | `CrossSection` | `f64` | `0..` | none | 1 | [Indicator-UpDownVolumeRatio](/Indicators/Indicator-UpDownVolumeRatio) |

## Seasonality & Session

Timestamp-driven indicators that key off the wall-clock fields of
`Candle::timestamp` (shifted by a `utc_offset_minutes` constructor argument so
the buckets line up with the relevant exchange session). Session, day and month
rollovers are detected automatically — callers never invoke `reset()` at a
boundary.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `SessionVwap` | Session-anchored volume-weighted average price. | `Candle` | `f64` | price units | `utc_offset=0` | 1 | [Indicator-SessionVwap](/Indicators/Indicator-SessionVwap) |
| `SessionHighLow` | Running high / low of the current session. | `Candle` | `{high, low}` | price units | `utc_offset=0` | 1 | [Indicator-SessionHighLow](/Indicators/Indicator-SessionHighLow) |
| `SessionRange` | Per-session (Asia / EU / US) high-low range. | `Candle` | `{asia, eu, us}` | `>= 0` | `utc_offset=0` | 1 | [Indicator-SessionRange](/Indicators/Indicator-SessionRange) |
| `AverageDailyRange` | Mean high-low range of the last N completed sessions. | `Candle` | `f64` | `>= 0` | `period=14, utc_offset=0` | `period` | [Indicator-AverageDailyRange](/Indicators/Indicator-AverageDailyRange) |
| `OvernightGap` | Close-to-open return across the session boundary. | `Candle` | `f64` | unbounded | `utc_offset=0` | 2 | [Indicator-OvernightGap](/Indicators/Indicator-OvernightGap) |
| `OvernightIntradayReturn` | Splits the session return into overnight + intraday legs. | `Candle` | `{overnight, intraday}` | unbounded | `utc_offset=0` | 2 | [Indicator-OvernightIntradayReturn](/Indicators/Indicator-OvernightIntradayReturn) |
| `TurnOfMonth` | Mean daily return inside the turn-of-month window. | `Candle` | `f64` | unbounded | `n_first=3, n_last=1, utc_offset=0` | 2 | [Indicator-TurnOfMonth](/Indicators/Indicator-TurnOfMonth) |
| `SeasonalZScore` | Z-score of the current return vs the same hour-of-day history. | `Candle` | `f64` | unbounded | `utc_offset=0` | 2 | [Indicator-SeasonalZScore](/Indicators/Indicator-SeasonalZScore) |
| `TimeOfDayReturnProfile` | Mean bar return bucketed by intraday time. | `Candle` | `bins[]` | unbounded | `buckets=24, utc_offset=0` | 2 | [Indicator-TimeOfDayReturnProfile](/Indicators/Indicator-TimeOfDayReturnProfile) |
| `DayOfWeekProfile` | Mean bar return bucketed by weekday. | `Candle` | `bins[7]` | unbounded | `utc_offset=0` | 2 | [Indicator-DayOfWeekProfile](/Indicators/Indicator-DayOfWeekProfile) |
| `IntradayVolatilityProfile` | Return standard deviation bucketed by intraday time. | `Candle` | `bins[]` | `>= 0` | `buckets=24, utc_offset=0` | 2 | [Indicator-IntradayVolatilityProfile](/Indicators/Indicator-IntradayVolatilityProfile) |
| `VolumeByTimeProfile` | Mean traded volume bucketed by intraday time. | `Candle` | `bins[]` | `>= 0` | `buckets=24, utc_offset=0` | 1 | [Indicator-VolumeByTimeProfile](/Indicators/Indicator-VolumeByTimeProfile) |

## Chart Patterns

Swing-based classical chart patterns built on a non-repainting percent-threshold pivot tracker (5% swings). Each emits the uniform pattern sign — `+1` bullish, `-1` bearish, `0` otherwise — and is parameter-free.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `DoubleTopBottom` | Twin-peak / twin-trough reversal on the second matching extreme. | `Candle` | `f64` | `{-1, 0, +1}` | none | 5 | [Indicator-DoubleTopBottom](/Indicators/Indicator-DoubleTopBottom) |
| `TripleTopBottom` | Three matching peaks / troughs — a stronger reversal. | `Candle` | `f64` | `{-1, 0, +1}` | none | 6 | [Indicator-TripleTopBottom](/Indicators/Indicator-TripleTopBottom) |
| `HeadAndShoulders` | Central head, two matching shoulders, flat neckline (and inverse). | `Candle` | `f64` | `{-1, 0, +1}` | none | 6 | [Indicator-HeadAndShoulders](/Indicators/Indicator-HeadAndShoulders) |
| `Triangle` | Converging trendlines: ascending +1, descending -1, symmetrical leans with the last swing. | `Candle` | `f64` | `{-1, 0, +1}` | none | 5 | [Indicator-Triangle](/Indicators/Indicator-Triangle) |
| `Wedge` | Same-direction converging trendlines: rising wedge -1, falling wedge +1. | `Candle` | `f64` | `{-1, 0, +1}` | none | 5 | [Indicator-Wedge](/Indicators/Indicator-Wedge) |
| `FlagPennant` | Shallow consolidation against a pole — continuation in the pole direction. | `Candle` | `f64` | `{-1, 0, +1}` | none | 4 | [Indicator-FlagPennant](/Indicators/Indicator-FlagPennant) |
| `RectangleRange` | Flat support / resistance — mean-reversion off the touched boundary. | `Candle` | `f64` | `{-1, 0, +1}` | none | 5 | [Indicator-RectangleRange](/Indicators/Indicator-RectangleRange) |
| `CupAndHandle` | Rounded base with a shallow handle near the rim (and inverse). | `Candle` | `f64` | `{-1, 0, +1}` | none | 5 | [Indicator-CupAndHandle](/Indicators/Indicator-CupAndHandle) |

## Harmonic Patterns

Fibonacci-ratio harmonic patterns read from the last four or five confirmed swing pivots (X-A-B-C-D). Each emits `+1` when the terminal point D is a swing low (bullish), `-1` when D is a swing high, `0` otherwise; parameter-free, with the Fibonacci windows baked in as documented constants.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Abcd` | Four-point AB=CD: BC retraces AB, CD mirrors AB. | `Candle` | `f64` | `{-1, 0, +1}` | none | 5 | [Indicator-Abcd](/Indicators/Indicator-Abcd) |
| `Gartley` | Five-point harmonic with a 0.786 D completion. | `Candle` | `f64` | `{-1, 0, +1}` | none | 6 | [Indicator-Gartley](/Indicators/Indicator-Gartley) |
| `Butterfly` | Five-point harmonic with an extended (1.27-1.618 XA) D. | `Candle` | `f64` | `{-1, 0, +1}` | none | 6 | [Indicator-Butterfly](/Indicators/Indicator-Butterfly) |
| `Bat` | Five-point harmonic with a shallow B and 0.886 D. | `Candle` | `f64` | `{-1, 0, +1}` | none | 6 | [Indicator-Bat](/Indicators/Indicator-Bat) |
| `Crab` | Five-point harmonic with the deepest (1.618 XA) D. | `Candle` | `f64` | `{-1, 0, +1}` | none | 6 | [Indicator-Crab](/Indicators/Indicator-Crab) |
| `Shark` | Five-point harmonic with an expansion leg and 0.886-1.13 D. | `Candle` | `f64` | `{-1, 0, +1}` | none | 6 | [Indicator-Shark](/Indicators/Indicator-Shark) |
| `Cypher` | Five-point harmonic whose D retraces XC by 0.786. | `Candle` | `f64` | `{-1, 0, +1}` | none | 6 | [Indicator-Cypher](/Indicators/Indicator-Cypher) |
| `ThreeDrives` | Three symmetric drives with extension legs. | `Candle` | `f64` | `{-1, 0, +1}` | none | 6 | [Indicator-ThreeDrives](/Indicators/Indicator-ThreeDrives) |

## Fibonacci

Swing-based Fibonacci tooling built on the same non-repainting 5% pivot tracker as the chart and harmonic patterns. Each is parameter-free and emits a struct of price levels (or, for time zones, timing flags) for the most recent confirmed swing; the geometric tools (fan, arcs, channel) normalise their geometry to the swing leg's bar-width so the output is chart-scale-free. All return `None` until enough pivots have confirmed.

| Indicator | One-liner | Input | Output | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|----------|--------|-----------|
| `FibRetracement` | Seven retracement levels (0-100%) of the last swing leg. | `Candle` | 7×`f64` | none | 2 | [Indicator-FibRetracement](/Indicators/Indicator-FibRetracement) |
| `FibExtension` | Five extension ratios (127.2-261.8%) projected beyond the leg. | `Candle` | 5×`f64` | none | 2 | [Indicator-FibExtension](/Indicators/Indicator-FibExtension) |
| `FibProjection` | A-B-C measured-move target zone projected from C. | `Candle` | 4×`f64` | none | 3 | [Indicator-FibProjection](/Indicators/Indicator-FibProjection) |
| `AutoFib` | Retracement anchored on the dominant recent leg. | `Candle` | 7×`f64` | none | 2 | [Indicator-AutoFib](/Indicators/Indicator-AutoFib) |
| `GoldenPocket` | The 0.618-0.65 optimal-trade-entry band. | `Candle` | 3×`f64` | none | 2 | [Indicator-GoldenPocket](/Indicators/Indicator-GoldenPocket) |
| `FibConfluence` | Densest cluster of retracement levels across recent legs. | `Candle` | 2×`f64` | none | 3 | [Indicator-FibConfluence](/Indicators/Indicator-FibConfluence) |
| `FibFan` | Trendlines fanning through the leg's retracement levels. | `Candle` | 3×`f64` | none | 2 | [Indicator-FibFan](/Indicators/Indicator-FibFan) |
| `FibArcs` | Semicircular retracement levels decaying over time. | `Candle` | 3×`f64` | none | 2 | [Indicator-FibArcs](/Indicators/Indicator-FibArcs) |
| `FibChannel` | Sloped base trendline plus parallel Fibonacci offsets. | `Candle` | 4×`f64` | none | 3 | [Indicator-FibChannel](/Indicators/Indicator-FibChannel) |
| `FibTimeZones` | Markers at Fibonacci bar-distances from the latest pivot. | `Candle` | 2×`f64` | none | 2 | [Indicator-FibTimeZones](/Indicators/Indicator-FibTimeZones) |

## See also

- [Warmup Periods](Warmup-Periods) — verified table of every indicator's
  `warmup_period()`.
- [Indicator Chaining](/Indicator-Chaining) — combining indicators with
  `Chain` and the stacked-warmup rule.
- [Quickstart: Rust](Quickstart-Rust), [Quickstart: Python](Quickstart-Python),
  [Quickstart: Node](Quickstart-Node) — language-specific API surfaces.
- Source: <https://github.com/wickra-lib/wickra>
