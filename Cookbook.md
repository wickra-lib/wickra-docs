# Cookbook

Practical strategy recipes built on Wickra's streaming indicators. Each
recipe is a small, runnable snippet you can drop into a backtest loop or a
live trading bot. Both paths share the same indicator state, so the same
recipe works in either mode — see [Streaming vs Batch](Streaming-vs-Batch).

## 1. RSI mean reversion

Enter when RSI crosses out of an extreme; flatten when it returns to
neutral.

```python
import wickra as ta

rsi = ta.RSI(14)
position = 0  # 0 flat, +1 long, −1 short
for price in price_feed:
    v = rsi.update(price)
    if v is None:
        continue
    if position == 0 and v < 30:
        position = 1
        print(f"BUY at {price:.2f}")
    elif position == 1 and v > 50:
        position = 0
        print(f"EXIT long at {price:.2f}")
    elif position == 0 and v > 70:
        position = -1
        print(f"SHORT at {price:.2f}")
    elif position == -1 and v < 50:
        position = 0
        print(f"COVER short at {price:.2f}")
```

## 2. MACD histogram crossover

Trade in the direction of a MACD-histogram sign change. Zero-crossings of
the histogram (`MACD − signal`) are the canonical trigger and lead the
slower MACD-vs-signal line cross.

```rust
use wickra::{Indicator, MacdIndicator};

let mut macd = MacdIndicator::classic(); // (12, 26, 9)
let mut last_hist: Option<f64> = None;
for &price in &prices {
    if let Some(v) = macd.update(price) {
        if let Some(prev) = last_hist {
            if prev <= 0.0 && v.histogram > 0.0 {
                println!("BUY: MACD histogram turned positive at {price:.2}");
            } else if prev >= 0.0 && v.histogram < 0.0 {
                println!("SELL: MACD histogram turned negative at {price:.2}");
            }
        }
        last_hist = Some(v.histogram);
    }
}
```

## 3. Bollinger band breakout

Trade in the direction of a band-piercing close, taking the bands as a
dynamic support / resistance.

```python
import wickra as ta

bb = ta.BollingerBands(20, 2.0)
for price in price_feed:
    out = bb.update(price)
    if out is None:
        continue
    upper, _middle, lower, _stddev = out
    if price > upper:
        print(f"BREAKOUT (long): {price:.2f} > upper {upper:.2f}")
    elif price < lower:
        print(f"BREAKOUT (short): {price:.2f} < lower {lower:.2f}")
```

## 4. ADX-gated trend filter

Take EMA-crossover signals only when ADX confirms a trend is in place.
This is a textbook way to silence whipsaws in a ranging market.

```python
import wickra as ta

ema_fast = ta.EMA(20)
ema_slow = ta.EMA(50)
adx = ta.ADX(14)

# Candle indicators take one candle as a 6-tuple (open, high, low, close,
# volume, timestamp) or a dict with those keys — not three positional args.
for o, h, l, c, v, ts in candle_feed:
    f = ema_fast.update(c)
    s = ema_slow.update(c)
    a = adx.update((o, h, l, c, v, ts))   # (plus_di, minus_di, adx) or None
    if f is None or s is None or a is None:
        continue
    _, _, adx_v = a
    if adx_v < 25:
        continue  # ranging market — skip
    if f > s:
        print(f"LONG: EMA20 > EMA50, ADX={adx_v:.1f}")
    elif f < s:
        print(f"SHORT: EMA20 < EMA50, ADX={adx_v:.1f}")
```

## 5. Multi-timeframe confirmation

Only take a 1-minute entry when the 1-hour trend agrees. With Wickra you
keep one streaming indicator per timeframe and feed each only the candles
that belong to it. `wickra-data`'s [`Resampler`](Data-Layer) rolls one
candle stream up into a coarser one; the canonical example is
`examples/rust/src/bin/multi_timeframe.rs`.

```rust
use wickra::{Indicator, Rsi};

let mut rsi_1m = Rsi::new(14)?;
let mut rsi_1h = Rsi::new(14)?;

for candle in one_min_candles {
    let fast = rsi_1m.update(candle.close);

    if candle.is_hour_close {
        let slow = rsi_1h.update(candle.close);
        if let (Some(f), Some(s)) = (fast, slow) {
            if f > 70.0 && s > 50.0 {
                println!("strong overbought (1m {f:.1} / 1h {s:.1})");
            } else if f < 30.0 && s < 50.0 {
                println!("strong oversold (1m {f:.1} / 1h {s:.1})");
            }
        }
    }
}
```

## 6. SuperTrend trailing stop

`SuperTrend` is a single-line ATR-banded trailing stop with explicit flip
logic — drop it into a long-only loop to manage exits:

```python
import wickra as ta

st = ta.SuperTrend(10, 3.0)
position = 0  # 0 flat, +1 long
for o, h, l, c, v, ts in candle_feed:
    out = st.update((o, h, l, c, v, ts))   # candle 6-tuple → (value, direction)
    if out is None:
        continue
    value, direction = out
    if direction > 0 and position == 0:
        position = 1
        print(f"BUY at {c:.2f}, stop={value:.2f}")
    elif direction < 0 and position == 1:
        position = 0
        print(f"EXIT at {c:.2f} (SuperTrend flipped)")
```

## 7. Chained indicators

When you want an indicator computed *over the output of another*, use the
Rust `Chain` combinator. The chain itself implements `Indicator`, so you
can nest, stack, and feed it into anything that takes an indicator.

```rust
use wickra::{BatchExt, Chain, Ema, Rsi};

// RSI(7) of EMA(14)-smoothed closes.
let mut chain = Chain::new(Ema::new(14)?, Rsi::new(7)?);
let out: Vec<Option<f64>> = chain.batch(&prices);
```

See [Indicator Chaining](Indicator-Chaining) for the chained-warmup rule
and three-stage examples.

## 8. Ichimoku Tenkan/Kijun cross with cloud filter

[Ichimoku](Indicator-Ichimoku) returns its five lines as a tuple
`(tenkan, kijun, senkou_a, senkou_b, chikou)` — any element may be `None`
until that line is defined. The canonical entry is a Tenkan-above-Kijun
("TK") cross *confirmed* by price trading above the cloud (`max(span_a,
span_b)`).

```python
import wickra as ta

ichi = ta.Ichimoku(9, 26, 52, 26)
prev_tk = None
for o, h, l, c, v, ts in candle_feed:
    out = ichi.update((o, h, l, c, v, ts))   # 6-tuple candle in
    if out is None:
        continue
    tenkan, kijun, span_a, span_b, _chikou = out
    if None in (tenkan, kijun, span_a, span_b):
        continue
    tk = tenkan - kijun
    above_cloud = c > max(span_a, span_b)
    if prev_tk is not None and prev_tk <= 0.0 < tk and above_cloud:
        print(f"BULLISH TK cross above the cloud at {c:.2f}")
    elif prev_tk is not None and prev_tk >= 0.0 > tk and c < min(span_a, span_b):
        print(f"BEARISH TK cross below the cloud at {c:.2f}")
    prev_tk = tk
```

## 9. TD Sequential exhaustion

[TdSequential](Indicator-TdSequential) returns `(setup, countdown,
direction)` — both counts are signed (`+` buy, `−` sell) and capped at ±9
(setup) and ±13 (countdown). A completed buy setup (`+9`) or buy countdown
(`+13`) flags downside exhaustion and a mean-reversion long.

```python
import wickra as ta

td = ta.TdSequential(4, 9, 2, 13)
for o, h, l, c, v, ts in candle_feed:
    out = td.update((o, h, l, c, v, ts))
    if out is None:
        continue
    setup, countdown, _direction = out
    if setup == 9:
        print(f"Buy setup complete (+9) at {c:.2f} — downside exhaustion")
    elif setup == -9:
        print(f"Sell setup complete (−9) at {c:.2f} — upside exhaustion")
    if countdown == 13:
        print(f"Buy countdown 13 at {c:.2f} — reversal-long signal")
    elif countdown == -13:
        print(f"Sell countdown −13 at {c:.2f} — reversal-short signal")
```

## 10. Max-drawdown circuit breaker

Feed your mark-to-market account equity into a rolling
[MaxDrawdown](Indicator-MaxDrawdown) and halt new entries when the rolling
drawdown breaches a risk limit. The output is a *non-negative fraction*
(`0.20` = a 20 % decline from the window peak).

```python
import wickra as ta

mdd = ta.MaxDrawdown(252)   # ~one trading year of rolling lookback
halted = False
for equity in equity_curve:
    dd = mdd.update(equity)
    if dd is None:
        continue
    if not halted and dd > 0.20:
        halted = True
        print(f"RISK HALT: rolling drawdown {dd:.1%} exceeded 20%")
    elif halted and dd < 0.10:
        halted = False
        print(f"Risk normalised ({dd:.1%}) — entries re-enabled")
```

## 11. Beta-hedged market exposure

[Beta](Indicator-Beta) takes `(asset_return, benchmark_return)` pairs and
reports the rolling slope of the asset on the benchmark — exactly the hedge
ratio you need to neutralise market exposure.

```python
import wickra as ta

beta = ta.Beta(60)
NOTIONAL = 100_000  # long position in the asset, in account currency
for asset_ret, bench_ret in return_pairs:   # periodic returns, not prices
    b = beta.update(asset_ret, bench_ret)
    if b is None:
        continue
    hedge = b * NOTIONAL
    print(f"beta={b:.2f} → short {hedge:,.0f} of the index to hedge the long")
```

## See also

- [Indicators Overview](Indicators-Overview) — pick the right indicator
  for the question you are asking.
- [Streaming vs Batch](Streaming-vs-Batch) — why these recipes work
  bit-identically in both modes.
- [Data Layer](Data-Layer) — `Resampler` and the bundled BTCUSDT
  datasets for live multi-timeframe work.
