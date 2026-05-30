# Indicators Overview

Wickra ships **214 indicators** organised into **sixteen families**. Each
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

The sixteen families:

| # | Family | Count | What it answers |
|---|--------|-------|-----------------|
| 1 | [Moving Averages](#moving-averages) | 19 | Where is the smoothed trend line? |
| 2 | [Momentum Oscillators](#momentum-oscillators) | 20 | How fast is price changing; is it overbought? |
| 3 | [Trend & Directional](#trend--directional) | 13 | Is there a trend, and which way? |
| 4 | [Price Oscillators](#price-oscillators) | 11 | Difference-of-averages momentum around zero. |
| 5 | [Volatility & Bands](#volatility--bands) | 18 | How wide is the range; where are the envelopes? |
| 6 | [Bands & Channels](#bands--channels) | 11 | Price-envelope overlays beyond the volatility staples. |
| 7 | [Trailing Stops](#trailing-stops) | 12 | Where is the stop-loss for this trend? |
| 8 | [Volume](#volume) | 19 | Is volume confirming the move? |
| 9 | [Price Statistics](#price-statistics) | 19 | Per-bar price transforms and rolling regressions / statistics. |
| 10 | [Ehlers / Cycle (DSP)](#ehlers--cycle-dsp) | 16 | Cycle-extracting DSP filters and phase-aware tools. |
| 11 | [Pivots & S/R](#pivots--sr) | 7 | Session-anchored pivot levels and swing detectors. |
| 12 | [DeMark](#demark) | 12 | Tom DeMark's exhaustion / setup / countdown family. |
| 13 | [Ichimoku & Charts](#ichimoku--charts) | 2 | Japanese cloud chart and smoothed candles. |
| 14 | [Candlestick Patterns](#candlestick-patterns) | 15 | Classical 1- / 2- / 3-bar candle patterns. |
| 15 | [Market Profile](#market-profile) | 3 | Session value-area / opening-range / IB levels. |
| 16 | [Risk / Performance](#risk--performance) | 17 | Risk-adjusted return, drawdown, and tail-risk metrics. |

## Moving Averages

Smooth the price series to surface direction. All are single-input,
single-output (`f64 → f64`) except `Vwma`, which weights by volume.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Sma`   | Equal-weighted rolling mean over `period` closes. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Sma](Indicator-Sma) |
| `Ema`   | EMA with `α = 2 / (period + 1)`, SMA-seeded. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Ema](Indicator-Ema) |
| `Wma`   | Linear weights `1, 2, …, period`; newest bar matters most. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Wma](Indicator-Wma) |
| `Dema`  | Mulloy's `2·EMA − EMA(EMA)`; removes first-order EMA lag. | `f64` | `f64` | unbounded (price scale) | `period` | `2·period − 1` | [Indicator-Dema](Indicator-Dema) |
| `Tema`  | Mulloy's `3·EMA − 3·EMA(EMA) + EMA(EMA(EMA))`. | `f64` | `f64` | unbounded (price scale) | `period` | `3·period − 2` | [Indicator-Tema](Indicator-Tema) |
| `Hma`   | Hull's near-zero-lag `WMA(2·WMA(n/2) − WMA(n), √n)`. | `f64` | `f64` | unbounded (price scale) | `period` | `period + round(√period) − 1` | [Indicator-Hma](Indicator-Hma) |
| `Kama`  | Kaufman's adaptive average; efficiency ratio picks α per bar. | `f64` | `f64` | unbounded (price scale) | `(er_period=10, fast=2, slow=30)` | `er_period + 1` | [Indicator-Kama](Indicator-Kama) |
| `Smma`  | Wilder's RMA: SMA-seeded exponential average, `1/period` factor. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Smma](Indicator-Smma) |
| `Trima` | A `period`-window SMA applied twice; triangular weights. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Trima](Indicator-Trima) |
| `Zlema` | EMA of the de-lagged series `2·price − price[lag]`. | `f64` | `f64` | unbounded (price scale) | `period` | `lag + period` | [Indicator-Zlema](Indicator-Zlema) |
| `T3`    | Tillson's six-EMA cascade recombined with a volume factor `v`. | `f64` | `f64` | unbounded (price scale) | `(period, v=0.7)` (Python) | `6·period − 5` | [Indicator-T3](Indicator-T3) |
| `Vwma`  | Rolling mean of closes weighted by each bar's volume. | `Candle` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-Vwma](Indicator-Vwma) |
| `Alma`  | Gaussian-weighted MA, kernel centred at `offset · (period − 1)`. | `f64` | `f64` | unbounded (price scale) | `(period=9, offset=0.85, sigma=6.0)` | `period` | [Indicator-Alma](Indicator-Alma) |
| `McGinleyDynamic` | Self-adjusting MA, `MD + (price − MD) / (0.6 · period · (price / MD)⁴)`. | `f64` | `f64` | unbounded (price scale) | `period` (10 in Python) | `period` | [Indicator-McGinleyDynamic](Indicator-McGinleyDynamic) |
| `Frama` | Ehlers' fractal-dimension-adaptive EMA over close-only window halves. | `f64` | `f64` | unbounded (price scale) | `period=16` (even) | `period` | [Indicator-Frama](Indicator-Frama) |
| `Vidya` | EMA whose alpha scales with \|CMO(cmo_period)\| / 100. | `f64` | `f64` | unbounded (price scale) | `(period=14, cmo_period=9)` | `cmo_period + 1` | [Indicator-Vidya](Indicator-Vidya) |
| `Jma`   | Jurik MA — three-stage filter reconstruction. | `f64` | `f64` | unbounded (price scale) | `(period=14, phase=0, power=2)` | `1` | [Indicator-Jma](Indicator-Jma) |
| `Alligator` | Three `Smma`s of `(high + low) / 2`: Jaw / Teeth / Lips. | `Candle` | `AlligatorOutput` (3) | unbounded (price scale) | `(jaw=13, teeth=8, lips=5)` | `max(jaw, teeth, lips)` | [Indicator-Alligator](Indicator-Alligator) |
| `Evwma` | Elastic volume-weighted recurrence over a rolling window. | `Candle` | `f64` | unbounded (price scale) | `period` (20 in Python) | `period` | [Indicator-Evwma](Indicator-Evwma) |

## Momentum Oscillators

Measure the *rate* of price change. Several are bounded by construction
(0–100 / ±100 oscillators), the rest are difference-driven.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Rsi`        | Wilder's RSI; smoothed `gain / (gain + loss) × 100`. | `f64` | `f64` | `[0, 100]` | `period = 14` (Python) | `period + 1` | [Indicator-Rsi](Indicator-Rsi) |
| `Stochastic` | `%K = (close − low_n)/(high_n − low_n) × 100`, smoothed into `%D`. | `Candle` | `(k, d)` | each in `[0, 100]` | `(k_period=14, d_period=3)` (Python) | `k_period + d_period − 1` | [Indicator-Stochastic](Indicator-Stochastic) |
| `Cci`        | `(typical − SMA(typical)) / (0.015 · mean_dev)`. | `Candle` | `f64` | unbounded (typically `±100`–`±200`) | `period = 20` (Python) | `period` | [Indicator-Cci](Indicator-Cci) |
| `Roc`        | `(price − price_n) / price_n × 100`; raw percentage change. | `f64` | `f64` | unbounded around zero | `period` | `period + 1` | [Indicator-Roc](Indicator-Roc) |
| `WilliamsR`  | `−100 × (high_n − close) / (high_n − low_n)`. | `Candle` | `f64` | `[−100, 0]` | `period = 14` (Python) | `period` | [Indicator-WilliamsR](Indicator-WilliamsR) |
| `Mfi`        | "Volume-weighted RSI": Wilder smoothing of money-flow ratios. | `Candle` | `f64` | `[0, 100]` | `period = 14` (Python) | `period` | [Indicator-Mfi](Indicator-Mfi) |
| `AwesomeOscillator` | `SMA(median, fast) − SMA(median, slow)`; zero-line crossover. | `Candle` | `f64` | unbounded around zero | `(fast=5, slow=34)` (Python) | `slow_period` | [Indicator-AwesomeOscillator](Indicator-AwesomeOscillator) |
| `Mom`        | `price − price[period]`; raw price-difference momentum. | `f64` | `f64` | unbounded around zero | `period = 10` (Python) | `period + 1` | [Indicator-Mom](Indicator-Mom) |
| `Cmo`        | Chande Momentum Oscillator; `100·(Σgain − Σloss)/(Σgain + Σloss)`. | `f64` | `f64` | `[−100, 100]` | `period = 14` (Python) | `period + 1` | [Indicator-Cmo](Indicator-Cmo) |
| `Tsi`        | True Strength Index; double-EMA-smoothed momentum ratio. | `f64` | `f64` | ≈ `[−100, 100]` | `(long=25, short=13)` (Python) | `long + short` | [Indicator-Tsi](Indicator-Tsi) |
| `Pmo`        | DecisionPoint Price Momentum Oscillator; doubly-smoothed ROC. | `f64` | `f64` | unbounded around zero | `(smoothing1=35, smoothing2=20)` (Python) | `2` | [Indicator-Pmo](Indicator-Pmo) |
| `StochRsi`   | Stochastic Oscillator applied to the RSI series. | `f64` | `f64` | `[0, 100]` | `(rsi_period=14, stoch_period=14)` (Python) | `rsi_period + stoch_period` | [Indicator-StochRsi](Indicator-StochRsi) |
| `UltimateOscillator` | Larry Williams' weighted three-timeframe buying-pressure oscillator. | `Candle` | `f64` | `[0, 100]` | `(short=7, mid=14, long=28)` (Python) | `max(short,mid,long) + 1` | [Indicator-UltimateOscillator](Indicator-UltimateOscillator) |
| `Rvi`        | `SMA(close − open, period) / SMA(high − low, period)`. | `Candle` | `f64` | unbounded (typically `(−1, 1)`) | `period = 10` (Python) | `period` | [Indicator-Rvi](Indicator-Rvi) |
| `Pgo`        | `(close − SMA(close, period)) / EMA(TR, period)`. | `Candle` | `f64` | unbounded | `period = 14` (Python) | `period` | [Indicator-Pgo](Indicator-Pgo) |
| `Kst`        | Pring's `1·RCMA_1 + 2·RCMA_2 + 3·RCMA_3 + 4·RCMA_4`, plus SMA signal. | `f64` | `(kst, signal)` | unbounded | 9 periods, see deep-dive | longest `roc_i + sma_i` + `signal − 1` | [Indicator-Kst](Indicator-Kst) |
| `Smi`        | Blau's doubly-EMA-smoothed close-vs-range displacement. | `Candle` | `f64` | `[−100, 100]` | `(period=5, d=3, d2=3)` | `period + d + d2 − 2` | [Indicator-Smi](Indicator-Smi) |
| `LaguerreRsi` | Ehlers' 4-stage Laguerre filter with RSI up/down accumulator. | `f64` | `f64` | `[0, 100]` (clamped) | `gamma = 0.5` | `1` | [Indicator-LaguerreRsi](Indicator-LaguerreRsi) |
| `ConnorsRsi` | Average of `RSI(close)`, `RSI(streak)`, percentile-rank of returns. | `f64` | `f64` | `[0, 100]` | `(3, 2, 100)` | `max(period_rsi+1, period_streak+2, period_rank+1)` | [Indicator-ConnorsRsi](Indicator-ConnorsRsi) |
| `Inertia`    | `LinearRegression(RVI(rvi_period), linreg_period)`. | `Candle` | `f64` | unbounded | `(rvi=14, linreg=20)` | `rvi_period + linreg_period − 1` | [Indicator-Inertia](Indicator-Inertia) |

## Trend & Directional

Answer whether a trend exists and which way it points — directional systems,
crossover packages and trend-versus-range filters.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `MacdIndicator` | `EMA(fast) − EMA(slow)` plus a signal EMA and the histogram. | `f64` | `(macd, signal, histogram)` | unbounded around zero | `(fast=12, slow=26, signal=9)` (Python) | `slow + signal − 1` | [Indicator-MacdIndicator](Indicator-MacdIndicator) |
| `Adx`     | Wilder's directional system: `+DI`, `−DI` and the `ADX` strength index. | `Candle` | `(plus_di, minus_di, adx)` | each in `[0, 100]` | `period = 14` (Python) | `2·period` | [Indicator-Adx](Indicator-Adx) |
| `Adxr`    | Wilder's ADX-rating: average of `ADX_t` and `ADX_{t − (period − 1)}`. | `Candle` | `f64` | `[0, 100]` | `period = 14` (Python) | `3·period − 1` | [Indicator-Adxr](Indicator-Adxr) |
| `Aroon`   | Bars-since-high and bars-since-low scaled to `[0, 100]`. | `Candle` | `(up, down)` | each in `[0, 100]` | `period = 14` (Python) | `period + 1` | [Indicator-Aroon](Indicator-Aroon) |
| `Trix`    | Rate of change of a triple-smoothed EMA, `× 10000`. | `f64` | `f64` | unbounded around zero | `period = 15` (Python) | `3·period − 1` | [Indicator-Trix](Indicator-Trix) |
| `AroonOscillator` | `AroonUp − AroonDown`; the two Aroon lines as one gauge. | `Candle` | `f64` | `[−100, 100]` | `period = 14` (Python) | `period + 1` | [Indicator-AroonOscillator](Indicator-AroonOscillator) |
| `Vortex`  | Vortex Indicator `VI+` / `VI−`; crossings mark trend onset. | `Candle` | `(plus, minus)` | each `>= 0` | `period = 14` (Python) | `period + 1` | [Indicator-Vortex](Indicator-Vortex) |
| `Rwi`     | Poulos' Random Walk Index: actual displacement vs `ATR_i · sqrt(i)`. | `Candle` | `(high, low)` | each `>= 0` | `period = 14` (Python) | `period` | [Indicator-Rwi](Indicator-Rwi) |
| `Tii`     | Share of recent SMA-deviations that are positive, scaled to `[0, 100]`. | `f64` | `f64` | `[0, 100]` | `(sma_period=60, dev_period=30)` (Python) | `sma_period + dev_period − 1` | [Indicator-Tii](Indicator-Tii) |
| `WaveTrend` | LazyBear: 3-stage EMA cascade through the typical-price channel index. | `Candle` | `(wt1, wt2)` | typically `[-100, +100]` | `(channel=10, average=21, signal=4)` (Python) | `2·channel + average + signal − 3` | [Indicator-WaveTrend](Indicator-WaveTrend) |
| `MassIndex` | Dorsey's range-expansion sum of the EMA-of-range ratio. | `Candle` | `f64` | `> 0` | `(ema_period=9, sum_period=25)` (Python) | `2·ema_period + sum_period − 2` | [Indicator-MassIndex](Indicator-MassIndex) |
| `ChoppinessIndex` | Summed true range over the high-low span, log-scaled. | `Candle` | `f64` | `[0, 100]` | `period = 14` (Python) | `period` | [Indicator-ChoppinessIndex](Indicator-ChoppinessIndex) |
| `VerticalHorizontalFilter` | Net price move divided by total move over `period`. | `f64` | `f64` | `[0, 1]` | `period = 28` (Python) | `period + 1` | [Indicator-VerticalHorizontalFilter](Indicator-VerticalHorizontalFilter) |

## Price Oscillators

Difference-of-averages and intrabar oscillators that swing around a zero line.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Ppo`     | Percentage Price Oscillator; `100·(EMA_fast − EMA_slow)/EMA_slow`. | `f64` | `f64` | unbounded around zero (percent) | `(fast=12, slow=26)` (Python) | `slow` | [Indicator-Ppo](Indicator-Ppo) |
| `Dpo`     | Detrended Price Oscillator; `price[t − period/2 − 1] − SMA(period)`. | `f64` | `f64` | unbounded around zero | `period = 20` (Python) | `max(period, period/2 + 2)` | [Indicator-Dpo](Indicator-Dpo) |
| `Coppock` | Coppock Curve; `WMA(ROC(long) + ROC(short), wma_period)`. | `f64` | `f64` | unbounded around zero | `(roc_long=14, roc_short=11, wma_period=10)` (Python) | `max(roc_long, roc_short) + wma_period` | [Indicator-Coppock](Indicator-Coppock) |
| `AcceleratorOscillator` | `AO − SMA(AO, signal)`; the acceleration of momentum. | `Candle` | `f64` | unbounded around zero | `(ao_fast=5, ao_slow=34, signal_period=5)` (Python) | `ao_slow + signal_period − 1` | [Indicator-AcceleratorOscillator](Indicator-AcceleratorOscillator) |
| `BalanceOfPower` | `(close − open) / (high − low)`; intrabar buyer/seller control. | `Candle` | `f64` | `[−1, +1]` | (no parameters) | `1` | [Indicator-BalanceOfPower](Indicator-BalanceOfPower) |
| `Apo`     | Absolute Price Oscillator; raw `EMA_fast − EMA_slow`. | `f64` | `f64` | unbounded around zero | `(fast=12, slow=26)` (Python) | `slow` | [Indicator-Apo](Indicator-Apo) |
| `AwesomeOscillatorHistogram` | `AO − AO_{t-1}`; differenced Awesome Oscillator. | `Candle` | `f64` | unbounded around zero | `(fast=5, slow=34)` (Python) | `slow + 1` | [Indicator-AwesomeOscillatorHistogram](Indicator-AwesomeOscillatorHistogram) |
| `Cfo`     | Chande Forecast Oscillator; `100·(close − linreg_endpoint)/close`. | `f64` | `f64` | unbounded around zero (percent) | `period = 14` (Python) | `period` | [Indicator-Cfo](Indicator-Cfo) |
| `ZeroLagMacd` | MACD with ZLEMA in place of EMA; faster, slightly noisier. | `f64` | `(macd, signal, histogram)` | unbounded around zero | `(fast=12, slow=26, signal=9)` | `~50` | [Indicator-ZeroLagMacd](Indicator-ZeroLagMacd) |
| `ElderImpulse` | Alexander Elder's `(EMA-slope, MACD-hist-slope)` regime classifier. | `f64` | `f64` (-1, 0, +1) | `{-1, 0, +1}` | `(ema_period=13, macd...)` (Python) | `slow + signal − 1` | [Indicator-ElderImpulse](Indicator-ElderImpulse) |
| `Stc`     | Schaff Trend Cycle; double-stochastic of MACD. | `f64` | `f64` | `[0, 100]` | `(fast=23, slow=50, cycle=10)` (Python) | `~slow + cycle` | [Indicator-Stc](Indicator-Stc) |

## Volatility & Bands

Indicators that measure dispersion / range and those that draw an envelope
around price.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Atr`     | Wilder-smoothed True Range; per-bar absolute volatility. | `Candle` | `f64` | `[0, ∞)` (price scale) | `period = 14` (Python) | `period` | [Indicator-Atr](Indicator-Atr) |
| `BollingerBands` | SMA middle band with `±multiplier × population_stddev` bands. | `f64` | `(upper, middle, lower, stddev)` | unbounded (price scale) | `(period=20, multiplier=2.0)` (Python) | `period` | [Indicator-BollingerBands](Indicator-BollingerBands) |
| `Keltner` | EMA middle band with `±multiplier × ATR` bands. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `(ema_period=20, atr_period=10, multiplier=2.0)` (Python) | `max(ema_period, atr_period)` | [Indicator-Keltner](Indicator-Keltner) |
| `Donchian` | Highest high and lowest low over `period` bars. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `period = 20` (Python) | `period` | [Indicator-Donchian](Indicator-Donchian) |
| `Natr`    | `100·ATR/close`; ATR as a percentage. | `Candle` | `f64` | `[0, ∞)` (percent) | `period = 14` (Python) | `period` | [Indicator-Natr](Indicator-Natr) |
| `StdDev`  | Rolling population standard deviation of price. | `f64` | `f64` | `[0, ∞)` (price scale) | `period = 20` (Python) | `period` | [Indicator-StdDev](Indicator-StdDev) |
| `UlcerIndex` | RMS of trailing-high drawdowns; downside-only risk. | `f64` | `f64` | `[0, ∞)` (percent) | `period = 14` (Python) | `2·period − 1` | [Indicator-UlcerIndex](Indicator-UlcerIndex) |
| `HistoricalVolatility` | Annualised sample stddev of log returns. | `f64` | `f64` | `[0, ∞)` (annualised percent) | `(period=20, trading_periods=252)` (Python) | `period + 1` | [Indicator-HistoricalVolatility](Indicator-HistoricalVolatility) |
| `BollingerBandwidth` | `(upper − lower) / middle` of the Bollinger Bands. | `f64` | `f64` | `[0, ∞)` | `(period=20, multiplier=2.0)` (Python) | `period` | [Indicator-BollingerBandwidth](Indicator-BollingerBandwidth) |
| `PercentB` | `(price − lower) / (upper − lower)`; price position in the bands. | `f64` | `f64` | unbounded (`0`–`1` inside) | `(period=20, multiplier=2.0)` (Python) | `period` | [Indicator-PercentB](Indicator-PercentB) |
| `TrueRange` | `max(H−L, |H−prevC|, |L−prevC|)`; raw single-bar volatility. | `Candle` | `f64` | `[0, ∞)` (price scale) | (no parameters) | `1` | [Indicator-TrueRange](Indicator-TrueRange) |
| `ChaikinVolatility` | Rate of change of an EMA-smoothed high-low spread. | `Candle` | `f64` | unbounded around zero (percent) | `(ema_period=10, roc_period=10)` (Python) | `ema_period + roc_period` | [Indicator-ChaikinVolatility](Indicator-ChaikinVolatility) |
| `DetrendedStdDev` | Standard deviation of OLS residuals — noise around the trend. | `f64` | `f64` | `[0, ∞)` (price scale) | `period` | `period` | [Indicator-DetrendedStdDev](Indicator-DetrendedStdDev) |
| `RVIVolatility` | RSI-shaped volatility *direction* gauge built on rolling stddev. | `f64` | `f64` | `[0, 100]` | `period = 10` (Python) | `2·period − 1` | [Indicator-RviVolatility](Indicator-RviVolatility) |
| `ParkinsonVolatility` | High-low realised vol; ~5× more efficient than C2C stddev. | `Candle` | `f64` | `[0, ∞)` (annualised percent) | `(period=20, trading_periods=252)` (Python) | `period` | [Indicator-ParkinsonVolatility](Indicator-ParkinsonVolatility) |
| `GarmanKlassVolatility` | OHLC realised vol; ~7.4× efficient, biased under drift. | `Candle` | `f64` | `[0, ∞)` (annualised percent) | `(period=20, trading_periods=252)` (Python) | `period` | [Indicator-GarmanKlassVolatility](Indicator-GarmanKlassVolatility) |
| `RogersSatchellVolatility` | Drift-free OHLC realised vol; exact under arbitrary Brownian drift. | `Candle` | `f64` | `[0, ∞)` (annualised percent) | `(period=20, trading_periods=252)` (Python) | `period` | [Indicator-RogersSatchellVolatility](Indicator-RogersSatchellVolatility) |
| `YangZhangVolatility` | Drift- and gap-robust OHLC blend of overnight, open-close and Rogers-Satchell. | `Candle` | `f64` | `[0, ∞)` (annualised percent) | `(period=20, trading_periods=252)` (Python) | `period + 1` | [Indicator-YangZhangVolatility](Indicator-YangZhangVolatility) |

## Bands & Channels

Price-envelope overlays beyond the volatility-housed Bollinger / Keltner /
Donchian trio. Eleven additional bands organised by what *drives* their
width: fixed percent, ATR, range, regression-residual stddev, fractal
swings, or volume-weighted stddev.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `MaEnvelope` | SMA centerline with fixed-percent envelope. | `f64` | `(upper, middle, lower)` | unbounded (price scale) | `(period=20, percent=0.025)` (Python) | `period` | [Indicator-MaEnvelope](Indicator-MaEnvelope) |
| `AccelerationBands` | Price Headley's momentum-biased bands; width scales with `(H − L) / (H + L)`. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `(period=20, factor=0.001)` (Python) | `period` | [Indicator-AccelerationBands](Indicator-AccelerationBands) |
| `StarcBands` | Stoller Average Range Channel — `SMA(close) ± k·ATR`. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `(sma_period=6, atr_period=15, multiplier=2.0)` (Python) | `max(sma_period, atr_period)` | [Indicator-StarcBands](Indicator-StarcBands) |
| `AtrBands` | Close-anchored envelope `close ± k·ATR`; stop/target bracket. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `(period=14, multiplier=3.0)` (Python) | `period` | [Indicator-AtrBands](Indicator-AtrBands) |
| `HurstChannel` | SMA centerline wrapped by the rolling high-low range. | `Candle` | `(upper, middle, lower)` | unbounded (price scale) | `(period=10, multiplier=0.5)` (Python) | `period` | [Indicator-HurstChannel](Indicator-HurstChannel) |
| `LinRegChannel` | OLS endpoint `± k · σ` of regression residuals. | `f64` | `(upper, middle, lower)` | unbounded (price scale) | `(period=20, multiplier=2.0)` (Python) | `period` | [Indicator-LinRegChannel](Indicator-LinRegChannel) |
| `StandardErrorBands` | OLS endpoint `± k · stderr` (`n − 2` denominator). | `f64` | `(upper, middle, lower)` | unbounded (price scale) | `(period=21, multiplier=2.0)` (Python) | `period` | [Indicator-StandardErrorBands](Indicator-StandardErrorBands) |
| `DoubleBollinger` | Two concentric Bollinger envelopes (`±k_inner·σ`, `±k_outer·σ`). | `f64` | 5 bands | unbounded (price scale) | `(period=20, k_inner=1.0, k_outer=2.0)` (Python) | `period` | [Indicator-DoubleBollinger](Indicator-DoubleBollinger) |
| `TtmSqueeze` | BB-inside-KC squeeze flag + detrended-close momentum (LinReg). | `Candle` | `(squeeze, momentum)` | `squeeze ∈ {0,1}`; `momentum` unbounded | `(period=20, bb_mult=2.0, kc_mult=1.5)` (Python) | `period` | [Indicator-TtmSqueeze](Indicator-TtmSqueeze) |
| `FractalChaosBands` | Step-function envelope of the latest Bill Williams 5-bar fractals. | `Candle` | `(upper, lower)` | unbounded (price scale) | `k = 2` (Python) | `2k + 1` plus first fractal of each kind | [Indicator-FractalChaosBands](Indicator-FractalChaosBands) |
| `VwapStdDevBands` | Cumulative VWAP `± k·σ` (volume-weighted standard deviation). | `Candle` | `(upper, middle, lower, stddev)` | unbounded (price scale) | `multiplier = 2.0` (Python) | `1` | [Indicator-VwapStdDevBands](Indicator-VwapStdDevBands) |

## Trailing Stops

ATR-driven stop-loss trackers: per-bar levels that follow a trend and flip
when price closes through them.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Psar`    | Wilder's Parabolic Stop-and-Reverse; flips sides on a crossing. | `Candle` | `f64` | unbounded (price scale) | `(af_start=0.02, af_step=0.02, af_max=0.20)` (Python) | `2` | [Indicator-Psar](Indicator-Psar) |
| `SuperTrend` | ATR-banded trailing stop with explicit flip logic. | `Candle` | `(value, direction)` | `value` price scale; `direction` `±1` | `(atr_period=10, multiplier=3.0)` (Python) | `atr_period` | [Indicator-SuperTrend](Indicator-SuperTrend) |
| `ChandelierExit` | `highest_high − k·ATR` (long) and `lowest_low + k·ATR` (short). | `Candle` | `(long_stop, short_stop)` | unbounded (price scale) | `(period=22, multiplier=3.0)` (Python) | `period` | [Indicator-ChandelierExit](Indicator-ChandelierExit) |
| `ChandeKrollStop` | Two-stage ATR stop: extreme-based, then smoothed. | `Candle` | `(stop_long, stop_short)` | unbounded (price scale) | `(atr_period=10, atr_multiplier=1.0, stop_period=9)` (Python) | `atr_period + stop_period − 1` | [Indicator-ChandeKrollStop](Indicator-ChandeKrollStop) |
| `AtrTrailingStop` | A single line trailing the close by `k·ATR`, ratcheting. | `Candle` | `f64` | unbounded (price scale) | `(atr_period=14, multiplier=3.0)` (Python) | `atr_period` | [Indicator-AtrTrailingStop](Indicator-AtrTrailingStop) |
| `HiLoActivator` | SMA(high) / SMA(low) state-machine trail (Crabel-style). | `Candle` | `f64` | unbounded (price scale) | `period = 3` (Python) | `period + 1` | [Indicator-HiLoActivator](Indicator-HiLoActivator) |
| `VoltyStop` | Kase's extreme-close-anchored ATR trail (no give-back on pullbacks). | `Candle` | `f64` | unbounded (price scale) | `(atr_period=14, multiplier=2.0)` | `atr_period + 1` | [Indicator-VoltyStop](Indicator-VoltyStop) |
| `YoyoExit` | Long-only ATR trail with passive re-entry trigger above the trail. | `Candle` | `f64` | unbounded (price scale) | `(atr_period=14, multiplier=2.0)` | `atr_period + 1` | [Indicator-YoyoExit](Indicator-YoyoExit) |
| `DonchianStop` | Turtle exit channel: lowest low / highest high over `period`. | `Candle` | `(stop_long, stop_short)` | unbounded (price scale) | `period = 10` | `period` | [Indicator-DonchianStop](Indicator-DonchianStop) |
| `PercentageTrailingStop` | Fixed-percentage flip-on-close-through trail. | `f64` | `f64` | unbounded (price scale) | `percent = 5.0` | `1` | [Indicator-PercentageTrailingStop](Indicator-PercentageTrailingStop) |
| `StepTrailingStop` | Grid-snapped trail; ratchets in discrete `step_size` increments. | `f64` | `f64` | unbounded (price scale, snapped) | `step_size = 1.0` | `1` | [Indicator-StepTrailingStop](Indicator-StepTrailingStop) |
| `RenkoTrailingStop` | Renko-brick-anchored trail; anchor moves only after full-brick advance. | `f64` | `f64` | unbounded (price scale) | `block_size = 1.0` | `1` | [Indicator-RenkoTrailingStop](Indicator-RenkoTrailingStop) |

## Volume

Price moves weighted or confirmed by traded volume. All take `Candle` input.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Obv`     | On-Balance Volume: cumulative signed volume. | `Candle` | `f64` | unbounded (drifts with volume) | (no parameters) | `1` | [Indicator-Obv](Indicator-Obv) |
| `Vwap`    | Cumulative volume-weighted average price from the stream start; a sibling `RollingVwap(period)` is exposed for a finite window. | `Candle` | `f64` | unbounded (price scale) | (no parameters) | `1` (cumulative); `period` (rolling) | [Indicator-Vwap](Indicator-Vwap) (cumulative + [rolling](Indicator-Vwap#rollingvwap-finite-window)) |
| `Adl`     | Accumulation/Distribution Line; cumulative range-weighted volume. | `Candle` | `f64` | unbounded (drifts with volume) | (no parameters) | `1` | [Indicator-Adl](Indicator-Adl) |
| `VolumePriceTrend` | Cumulative `volume · ROC`; volume weighted by percentage move. | `Candle` | `f64` | unbounded (drifts with volume) | (no parameters) | `1` | [Indicator-VolumePriceTrend](Indicator-VolumePriceTrend) |
| `ChaikinMoneyFlow` | Summed money-flow volume over summed volume across `period` bars. | `Candle` | `f64` | `[−1, +1]` | `period = 20` (Python) | `period` | [Indicator-ChaikinMoneyFlow](Indicator-ChaikinMoneyFlow) |
| `ChaikinOscillator` | `EMA(ADL, fast) − EMA(ADL, slow)`; the MACD of the ADL. | `Candle` | `f64` | unbounded around zero | `(fast=3, slow=10)` (Python) | `slow` | [Indicator-ChaikinOscillator](Indicator-ChaikinOscillator) |
| `ForceIndex` | `EMA((close − prev_close) · volume, period)`. | `Candle` | `f64` | unbounded around zero | `period = 13` (Python) | `period + 1` | [Indicator-ForceIndex](Indicator-ForceIndex) |
| `EaseOfMovement` | `SMA` of distance travelled per unit of volume. | `Candle` | `f64` | unbounded around zero | `(period=14, divisor=1e8)` (Python) | `period + 1` | [Indicator-EaseOfMovement](Indicator-EaseOfMovement) |
| `RollingVwap` | VWAP over a finite rolling window (vs the cumulative `Vwap`). | `Candle` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-RollingVwap](Indicator-RollingVwap) |
| `AnchoredVwap` | Cumulative VWAP from a user-set anchor bar (event-anchored fair price). | `Candle` | `f64` | unbounded (price scale) | (set anchor via `set_anchor()`) | `1` post-anchor | [Indicator-AnchoredVwap](Indicator-AnchoredVwap) |
| `AdOscillator` | Williams' Accumulation/Distribution — volume-less cumulative price flow. | `Candle` | `f64` | unbounded | (no parameters) | `2` | [Indicator-AdOscillator](Indicator-AdOscillator) |
| `Kvo` | Klinger Volume Oscillator — long/short EMAs of trend-aware volume force. | `Candle` | `(kvo, signal)` | unbounded around zero | `(34, 55, 13)` | `slow + signal − 1` | [Indicator-Kvo](Indicator-Kvo) |
| `VolumeOscillator` | `100·(SMA(vol,fast) − SMA(vol,slow))/SMA(vol,slow)`. | `Candle` | `f64` | unbounded above `−100` | `(fast=14, slow=28)` | `slow` | [Indicator-VolumeOscillator](Indicator-VolumeOscillator) |
| `Vzo` | Volume Zone Oscillator — `100·EMA(signed vol)/EMA(\|vol\|)`. | `Candle` | `f64` | `[−100, +100]` | `period = 14` | `period + 1` | [Indicator-Vzo](Indicator-Vzo) |
| `Tsv` | Time Segmented Volume — rolling sum of `(close-change · volume)`. | `Candle` | `f64` | unbounded around zero | `period = 18` | `period + 1` | [Indicator-Tsv](Indicator-Tsv) |
| `Nvi` | Negative Volume Index — cumulative; updates only on volume contraction. | `Candle` | `f64` | unbounded (anchored at 1000) | (no parameters) | `2` | [Indicator-Nvi](Indicator-Nvi) |
| `Pvi` | Positive Volume Index — mirror of NVI; updates only on volume expansion. | `Candle` | `f64` | unbounded (anchored at 1000) | (no parameters) | `2` | [Indicator-Pvi](Indicator-Pvi) |
| `DemandIndex` | Sibbet's EMA-smoothed buying-vs-selling pressure ratio. | `Candle` | `f64` | unbounded (typically `[-100, +100]`) | `period = 20` | `period + 1` | [Indicator-DemandIndex](Indicator-DemandIndex) |
| `MarketFacilitationIndex` | Williams' `(high − low) / volume` per-bar facilitation. | `Candle` | `f64` | `[0, ∞)` | (no parameters) | `1` | [Indicator-MarketFacilitationIndex](Indicator-MarketFacilitationIndex) |

## Price Statistics

Per-bar price transforms and rolling least-squares regressions.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `TypicalPrice`  | `(high + low + close) / 3`. | `Candle` | `f64` | unbounded (price scale) | (no parameters) | `1` | [Indicator-TypicalPrice](Indicator-TypicalPrice) |
| `MedianPrice`   | `(high + low) / 2`. | `Candle` | `f64` | unbounded (price scale) | (no parameters) | `1` | [Indicator-MedianPrice](Indicator-MedianPrice) |
| `WeightedClose` | `(high + low + 2·close) / 4`. | `Candle` | `f64` | unbounded (price scale) | (no parameters) | `1` | [Indicator-WeightedClose](Indicator-WeightedClose) |
| `LinearRegression` | Endpoint of the rolling least-squares line. | `f64` | `f64` | unbounded (price scale) | `period = 14` (Python) | `period` | [Indicator-LinearRegression](Indicator-LinearRegression) |
| `LinRegSlope`   | Slope of the rolling least-squares line. | `f64` | `f64` | unbounded around zero | `period = 14` (Python) | `period` | [Indicator-LinRegSlope](Indicator-LinRegSlope) |
| `ZScore`        | `(price − SMA(n)) / population_stddev(n)`. | `f64` | `f64` | unbounded around zero | `period = 20` (Python) | `period` | [Indicator-ZScore](Indicator-ZScore) |
| `LinRegAngle`   | The rolling regression slope as a degree angle. | `f64` | `f64` | `(−90°, +90°)` | `period = 14` (Python) | `period` | [Indicator-LinRegAngle](Indicator-LinRegAngle) |
| `Variance`      | Rolling population variance (second central moment). | `f64` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-Variance](Indicator-Variance) |
| `CoefficientOfVariation` | `StdDev / Mean` — dimensionless dispersion. | `f64` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-CoefficientOfVariation](Indicator-CoefficientOfVariation) |
| `Skewness`      | Rolling Pearson skewness (third standardised moment). | `f64` | `f64` | unbounded | `period` | `period` | [Indicator-Skewness](Indicator-Skewness) |
| `Kurtosis`      | Rolling excess kurtosis (fourth standardised moment − 3). | `f64` | `f64` | `[-2, ∞)` | `period` | `period` | [Indicator-Kurtosis](Indicator-Kurtosis) |
| `StandardError` | Standard error of the rolling OLS line; trend-detrended volatility. | `f64` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-StandardError](Indicator-StandardError) |
| `RSquared`      | R² of the rolling OLS fit; fraction of variance explained. | `f64` | `f64` | `[0, 1]` | `period` | `period` | [Indicator-RSquared](Indicator-RSquared) |
| `MedianAbsoluteDeviation` | Robust dispersion: `median(\|x − median\|)`. | `f64` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-MedianAbsoluteDeviation](Indicator-MedianAbsoluteDeviation) |
| `Autocorrelation` | Rolling lag-`k` Pearson autocorrelation. | `f64` | `f64` | `[-1, +1]` | `(period, lag)` | `period` | [Indicator-Autocorrelation](Indicator-Autocorrelation) |
| `HurstExponent` | Rescaled-range (R/S) Hurst exponent estimate. | `f64` | `f64` | typically `(0, 1)` | `(period, chunks)` | `period` | [Indicator-HurstExponent](Indicator-HurstExponent) |
| `PearsonCorrelation` | Rolling Pearson correlation of two synchronised series. | `(f64, f64)` | `f64` | `[-1, +1]` | `period` | `period` | [Indicator-PearsonCorrelation](Indicator-PearsonCorrelation) |
| `Beta`          | Rolling OLS sensitivity of asset to benchmark. | `(f64, f64)` | `f64` | unbounded | `period` | `period` | [Indicator-Beta](Indicator-Beta) |
| `SpearmanCorrelation` | Rolling rank correlation; monotone-relationship robust. | `(f64, f64)` | `f64` | `[-1, +1]` | `period` | `period` | [Indicator-SpearmanCorrelation](Indicator-SpearmanCorrelation) |

## Ehlers / Cycle (DSP)

John Ehlers' family of DSP cycle filters, phase-extraction tools, and
adaptive smoothers. All take `f64` price input.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Mama` | MESA Adaptive MA — adaptive alpha from Hilbert phase. | `f64` | `(mama, fama)` | unbounded (price scale) | `(0.5, 0.05)` | ~30 | [Indicator-Mama](Indicator-Mama) |
| `Fama` | Scalar wrapper exposing only MAMA's slow follower line. | `f64` | `f64` | unbounded (price scale) | `(0.5, 0.05)` | ~30 | [Indicator-Fama](Indicator-Fama) |
| `FisherTransform` | Min/max-normalises price + `0.5·ln((1+x)/(1-x))`. | `f64` | `f64` | unbounded; mostly `[-2, +2]` | `period` | `period` | [Indicator-FisherTransform](Indicator-FisherTransform) |
| `InverseFisherTransform` | `tanh(scale · input)`; bounded squash. | `f64` | `f64` | `[-1, +1]` | `scale` | `1` | [Indicator-InverseFisherTransform](Indicator-InverseFisherTransform) |
| `SuperSmoother` | Ehlers' 2-pole Butterworth lowpass filter. | `f64` | `f64` | unbounded (price scale) | `period` | `2` | [Indicator-SuperSmoother](Indicator-SuperSmoother) |
| `HilbertDominantCycle` | Truncated-Hilbert phase-derived dominant cycle period. | `f64` | `f64` | `[6, 50]` | (no parameters) | ~50 | [Indicator-HilbertDominantCycle](Indicator-HilbertDominantCycle) |
| `SineWave` | `sin(phase)` from Hilbert phase; pair with `lead()` for cross. | `f64` | `f64` | `[-1, +1]` | (no parameters) | ~50 | [Indicator-SineWave](Indicator-SineWave) |
| `Decycler` | `price − HighPass(price)` — low-lag trend extractor. | `f64` | `f64` | unbounded (price scale) | `period` | `2` | [Indicator-Decycler](Indicator-Decycler) |
| `DecyclerOscillator` | Difference of fast and slow `Decycler`s — MACD-shape. | `f64` | `f64` | unbounded around zero | `(fast, slow)` | `2` | [Indicator-DecyclerOscillator](Indicator-DecyclerOscillator) |
| `RoofingFilter` | High-pass + SuperSmoother = cycle-band bandpass. | `f64` | `f64` | unbounded around zero | `(lp, hp)` (default `10, 48`) | `2` | [Indicator-RoofingFilter](Indicator-RoofingFilter) |
| `CenterOfGravity` | Linear-weighted price barycenter, near-zero-lag. | `f64` | `f64` | unbounded around zero | `period` | `period` | [Indicator-CenterOfGravity](Indicator-CenterOfGravity) |
| `CyberneticCycle` | 4-tap pre-smoother + 2nd-order high-pass cycle extractor. | `f64` | `f64` | unbounded around zero | `period` | `6` | [Indicator-CyberneticCycle](Indicator-CyberneticCycle) |
| `AdaptiveCycle` | Half-period wrapper over `HilbertDominantCycle` for adaptive oscillators. | `f64` | `f64` | `[3, 25]` (integer) | (no parameters) | ~50 | [Indicator-AdaptiveCycle](Indicator-AdaptiveCycle) |
| `EmpiricalModeDecomposition` | Bandpass + envelope EMD; regime classifier. | `f64` | `f64` | unbounded around zero | `(period, fraction)` | `period` | [Indicator-EmpiricalModeDecomposition](Indicator-EmpiricalModeDecomposition) |
| `EhlersStochastic` | Stochastic on Roofing-Filter output (`[-1, +1]` scale). | `f64` | `f64` | `[-1, +1]` | `period` | `period + ~50` | [Indicator-EhlersStochastic](Indicator-EhlersStochastic) |
| `InstantaneousTrendline` | Near-zero-lag tuned recurrence — fast trend line. | `f64` | `f64` | unbounded (price scale) | `period` | `period` | [Indicator-InstantaneousTrendline](Indicator-InstantaneousTrendline) |

## Pivots & S/R

Session-anchored pivot levels and swing detectors. Pivots take a single
(typically session-aggregated) candle and emit fixed S/R levels for the next
session; swing detectors run continuously and mark structural pivots.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `ClassicPivots` | Floor-trader pivots: `PP, R1-R3, S1-S3` from `(H+L+C)/3`. | `Candle` | 7 fields | unbounded (price scale) | (no parameters) | `1` | [Indicator-ClassicPivots](Indicator-ClassicPivots) |
| `FibonacciPivots` | Pivot + Fib-ratio R/S levels (`0.382 / 0.618 / 1.000 · range`). | `Candle` | 7 fields | unbounded (price scale) | (no parameters) | `1` | [Indicator-FibonacciPivots](Indicator-FibonacciPivots) |
| `Camarilla` | Stott's close-anchored 4-tier `±(1.1 · range / {12,6,4,2})`. | `Candle` | 9 fields | unbounded (price scale) | (no parameters) | `1` | [Indicator-Camarilla](Indicator-Camarilla) |
| `WoodiePivots` | Close-weighted pivot `(H+L+2C)/4` with 2-tier R/S. | `Candle` | 5 fields | unbounded (price scale) | (no parameters) | `1` | [Indicator-WoodiePivots](Indicator-WoodiePivots) |
| `DemarkPivots` | Open-conditional 1-tier pivot (different formula per bar direction). | `Candle` | `(pp, r1, s1)` | unbounded (price scale) | (no parameters) | `1` | [Indicator-DemarkPivots](Indicator-DemarkPivots) |
| `WilliamsFractals` | Bill Williams' 5-bar swing-high / swing-low detector. | `Candle` | `(up, down: Option<f64>)` | unbounded (price scale) | (no parameters) | `5` | [Indicator-WilliamsFractals](Indicator-WilliamsFractals) |
| `ZigZag` | Non-repainting percentage-threshold swing detector. | `Candle` | `(swing, direction)` | unbounded (price scale) | `threshold = 0.05` | `2` | [Indicator-ZigZag](Indicator-ZigZag) |

## DeMark

Tom DeMark's full setup / countdown / pivot family. All bar-direction-aware
oscillators, exhaustion detectors, and protective-stop levels.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `TdSetup` | 9-bar momentum-exhaustion setup count (signed). | `Candle` | `f64` | `[-target, +target]` | `(lookback=4, target=9)` | `lookback + 1` | [Indicator-TdSetup](Indicator-TdSetup) |
| `TdSequential` | Setup + Countdown 13 — canonical DeMark exhaustion. | `Candle` | `(setup, countdown)` | signed | `(4, 9, 2, 13)` | `max(4, 2) + 1` | [Indicator-TdSequential](Indicator-TdSequential) |
| `TdCountdown` | Standalone Countdown 13 (auto-detects setup internally). | `Candle` | `f64` | `[-13, +13]` | `(4, 9, 2, 13)` | `max(4, 2) + 1` | [Indicator-TdCountdown](Indicator-TdCountdown) |
| `TdCombo` | Stricter, faster countdown variant (3 strictness conditions). | `Candle` | `f64` | `[-13, +13]` | `(4, 9, 2, 13)` | `max(4, 2) + 1` | [Indicator-TdCombo](Indicator-TdCombo) |
| `TdLines` | TDST support/resistance — extremes of completed setups. | `Candle` | `(resistance, support)` | unbounded; NaN before first setup | `(4, 9)` | `lookback + 1` | [Indicator-TdLines](Indicator-TdLines) |
| `TdDeMarker` | High/low-extension based 0-1 momentum oscillator. | `Candle` | `f64` | `[0, 1]` | `period = 14` | `period + 1` | [Indicator-TdDeMarker](Indicator-TdDeMarker) |
| `TdRei` | Range Expansion Index — conditionally-weighted short oscillator. | `Candle` | `f64` | `[-100, +100]` | `period = 5` | `period + 7` | [Indicator-TdRei](Indicator-TdRei) |
| `TdPressure` | Volume-weighted DeMark pressure oscillator. | `Candle` | `f64` | `[-100, +100]` | `period = 5` | `period` | [Indicator-TdPressure](Indicator-TdPressure) |
| `TdRangeProjection` | Next-bar high/low projection from current bar OHLC. | `Candle` | `(high, low)` | unbounded (price scale) | (no parameters) | `1` | [Indicator-TdRangeProjection](Indicator-TdRangeProjection) |
| `TdDifferential` | 2-bar pressure-shift reversal pattern. | `Candle` | `f64` | `{-1, 0, +1}` | (no parameters) | `2` | [Indicator-TdDifferential](Indicator-TdDifferential) |
| `TdOpen` | Gap-and-fade reversal signal (open outside prior range). | `Candle` | `f64` | `{-1, 0, +1}` | (no parameters) | `2` | [Indicator-TdOpen](Indicator-TdOpen) |
| `TdRiskLevel` | Protective-stop level from setup extreme + true range. | `Candle` | `(buy_risk, sell_risk)` | unbounded; NaN before first setup | `(4, 9)` | `lookback + 1` | [Indicator-TdRiskLevel](Indicator-TdRiskLevel) |

## Ichimoku & Charts

Japanese cloud charting and candle-smoothing transforms.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `Ichimoku` | Five-line cloud system (Tenkan, Kijun, Senkou A/B, Chikou). | `Candle` | 5 `Option<f64>` fields | unbounded (price scale) | `(9, 26, 52, 26)` | `senkou_b + displacement - 1` (77 at defaults) | [Indicator-Ichimoku](Indicator-Ichimoku) |
| `HeikinAshi` | "Average bar" candle-smoothing transform. | `Candle` | `(open, high, low, close)` | unbounded (price scale) | (no parameters) | `1` | [Indicator-HeikinAshi](Indicator-HeikinAshi) |

## Candlestick Patterns

Classical 1- / 2- / 3-bar candlestick pattern detectors. All take `Candle`
input and return a signed `f64` (`+1` bullish, `-1` bearish, `0` no signal)
unless noted. Pattern-shape checks only — combine with a trend filter for
actionable signals.

| Indicator | Pattern | Bars | Output | Defaults | Warmup | Deep dive |
|-----------|---------|------|--------|----------|--------|-----------|
| `Doji` | Indecision — body ≤ threshold·range. | 1 | `f64` (`0` or `+1`) | `body_threshold = 0.1` | `1` | [Indicator-Doji](Indicator-Doji) |
| `Hammer` | Small body top, long lower shadow ≥ 2·body. | 1 | `f64` (`0` or `+1`) | (no parameters) | `1` | [Indicator-Hammer](Indicator-Hammer) |
| `InvertedHammer` | Mirror of Hammer (long upper shadow). | 1 | `f64` (`0` or `+1`) | (no parameters) | `1` | [Indicator-InvertedHammer](Indicator-InvertedHammer) |
| `HangingMan` | Same shape as Hammer, bearish reading at top of uptrend. | 1 | `f64` (`0` or `-1`) | (no parameters) | `1` | [Indicator-HangingMan](Indicator-HangingMan) |
| `ShootingStar` | Same shape as Inverted Hammer, bearish reading at top. | 1 | `f64` (`0` or `-1`) | (no parameters) | `1` | [Indicator-ShootingStar](Indicator-ShootingStar) |
| `Marubozu` | Full-body candle with (near-)no shadows. | 1 | `f64` (`{-1, 0, +1}`) | `shadow_tolerance = 0.05` | `1` | [Indicator-Marubozu](Indicator-Marubozu) |
| `SpinningTop` | Small body, both shadows ≥ 2·body. | 1 | `f64` (`{-1, 0, +1}`) | `body_threshold = 0.3` | `1` | [Indicator-SpinningTop](Indicator-SpinningTop) |
| `Engulfing` | 2-bar full-body engulfing reversal. | 2 | `f64` (`{-1, 0, +1}`) | (no parameters) | `2` | [Indicator-Engulfing](Indicator-Engulfing) |
| `Harami` | 2-bar inside-body reversal (opposite of Engulfing). | 2 | `f64` (`{-1, 0, +1}`) | (no parameters) | `2` | [Indicator-Harami](Indicator-Harami) |
| `PiercingDarkCloud` | 2-bar gap-and-recover-past-midpoint reversal. | 2 | `f64` (`{-1, 0, +1}`) | (no parameters) | `2` | [Indicator-PiercingDarkCloud](Indicator-PiercingDarkCloud) |
| `Tweezer` | 2-bar matching-extreme reversal (Top / Bottom). | 2 | `f64` (`{-1, 0, +1}`) | `tolerance = 0.001` | `2` | [Indicator-Tweezer](Indicator-Tweezer) |
| `MorningEveningStar` | 3-bar reversal: long bar + star + opposite long bar. | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-MorningEveningStar](Indicator-MorningEveningStar) |
| `ThreeSoldiersOrCrows` | 3-bar continuation: three rising / falling long bars. | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-ThreeSoldiersOrCrows](Indicator-ThreeSoldiersOrCrows) |
| `ThreeInside` | Confirmed Harami: Harami + close past Bar 1 body. | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-ThreeInside](Indicator-ThreeInside) |
| `ThreeOutside` | Confirmed Engulfing: Engulfing + close past Bar 2 close. | 3 | `f64` (`{-1, 0, +1}`) | (no parameters) | `3` | [Indicator-ThreeOutside](Indicator-ThreeOutside) |

## Market Profile

Session-anchored value-area / opening-range / initial-balance indicators.
All require manual `reset()` at session boundaries.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `ValueArea` | Rolling Market Profile: POC + VAH + VAL via volume bins. | `Candle` | `(poc, vah, val)` | unbounded (price scale) | `(period, bin_count, value_area_pct)` | `period` | [Indicator-ValueArea](Indicator-ValueArea) |
| `InitialBalance` | First-N-bar session range, locked after warmup. | `Candle` | `(high, low)` | unbounded (price scale) | `period = 12` | `period` | [Indicator-InitialBalance](Indicator-InitialBalance) |
| `OpeningRange` | Locked first-N range + live breakout-distance from midpoint. | `Candle` | `(high, low, breakout_distance)` | unbounded (price scale) | `period = 6` | `period` | [Indicator-OpeningRange](Indicator-OpeningRange) |

## Risk / Performance

Risk-adjusted return ratios, drawdown analytics, and tail-risk measures.
Single-stream metrics take `f64` returns / equity; benchmark-relative metrics
take `(asset, benchmark)` pairs.

| Indicator | One-liner | Input | Output | Range | Defaults | Warmup | Deep dive |
|-----------|-----------|-------|--------|-------|----------|--------|-----------|
| `SharpeRatio` | `(mean - rf) / sample_stddev` rolling. | `f64` | `f64` | unbounded | `(period, rf)` | `period` | [Indicator-SharpeRatio](Indicator-SharpeRatio) |
| `SortinoRatio` | Sharpe with downside-only deviation. | `f64` | `f64` | unbounded | `(period, mar)` | `period` | [Indicator-SortinoRatio](Indicator-SortinoRatio) |
| `CalmarRatio` | `mean(returns) / max_drawdown(equity)` from window. | `f64` | `f64` | unbounded; `0` if no DD | `period` | `period` | [Indicator-CalmarRatio](Indicator-CalmarRatio) |
| `OmegaRatio` | `Σ gains-above-threshold / Σ losses-below`. | `f64` | `f64` | `[0, ∞)` (`Inf` if all-positive) | `(period, threshold)` | `period` | [Indicator-OmegaRatio](Indicator-OmegaRatio) |
| `MaxDrawdown` | Rolling worst peak-to-trough decline. | `f64` (equity) | `f64` | `[0, 1]` | `period` | `1` | [Indicator-MaxDrawdown](Indicator-MaxDrawdown) |
| `AverageDrawdown` | Rolling mean drawdown depth (same as PainIndex). | `f64` (equity) | `f64` | `[0, 1]` | `period` | `period` | [Indicator-AverageDrawdown](Indicator-AverageDrawdown) |
| `DrawdownDuration` | Bars elapsed since all-time peak. | `f64` (equity) | `u32` | `[0, ∞)` | (no parameters) | `1` | [Indicator-DrawdownDuration](Indicator-DrawdownDuration) |
| `PainIndex` | Mean drawdown depth (Becker). | `f64` (equity) | `f64` | `[0, 1]` | `period` | `period` | [Indicator-PainIndex](Indicator-PainIndex) |
| `ValueAtRisk` | Historical lower-tail quantile, sign-flipped. | `f64` | `f64` | `[0, ∞)` | `(period, confidence)` | `period` | [Indicator-ValueAtRisk](Indicator-ValueAtRisk) |
| `ConditionalValueAtRisk` | Mean of returns beyond VaR (Expected Shortfall). | `f64` | `f64` | `[0, ∞)` | `(period, confidence)` | `period` | [Indicator-ConditionalValueAtRisk](Indicator-ConditionalValueAtRisk) |
| `ProfitFactor` | `Σ positive / Σ \|negative\|` over window. | `f64` | `f64` | `[0, ∞)` (`Inf` if all-positive) | `period` | `period` | [Indicator-ProfitFactor](Indicator-ProfitFactor) |
| `GainLossRatio` | `mean(wins) / mean(\|losses\|)`. | `f64` | `f64` | `[0, ∞)` | `period` | `period` | [Indicator-GainLossRatio](Indicator-GainLossRatio) |
| `RecoveryFactor` | Cumulative `net_return / max_drawdown`. | `f64` (equity) | `f64` | unbounded; `0` if no DD | (no parameters) | `1` | [Indicator-RecoveryFactor](Indicator-RecoveryFactor) |
| `KellyCriterion` | Rolling Kelly fraction `winrate − (1−winrate)/payoff_ratio`. | `f64` | `f64` | unbounded; typically `(0, 1)` | `period` | `period` | [Indicator-KellyCriterion](Indicator-KellyCriterion) |
| `TreynorRatio` | `(mean_asset − rf) / Beta`. | `(f64, f64)` | `f64` | unbounded | `(period, rf)` | `period` | [Indicator-TreynorRatio](Indicator-TreynorRatio) |
| `InformationRatio` | `mean(active) / tracking_error`. | `(f64, f64)` | `f64` | unbounded | `period` | `period` | [Indicator-InformationRatio](Indicator-InformationRatio) |
| `Alpha` | Jensen's alpha — `mean(asset) − (rf + Beta·(mean_bench − rf))`. | `(f64, f64)` | `f64` | unbounded | `(period, rf)` | `period` | [Indicator-Alpha](Indicator-Alpha) |

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

## See also

- [Warmup Periods](Warmup-Periods) — verified table of every indicator's
  `warmup_period()`.
- [Indicator Chaining](Indicator-Chaining) — combining indicators with
  `Chain` and the stacked-warmup rule.
- [Quickstart: Rust](Quickstart-Rust), [Quickstart: Python](Quickstart-Python),
  [Quickstart: Node](Quickstart-Node) — language-specific API surfaces.
- Source: <https://github.com/wickra-lib/wickra>
