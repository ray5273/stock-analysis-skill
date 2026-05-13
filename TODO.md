# TODO

## kr-stock-analysis — Structure chart enhancements

The current structure chart (`*-chart-structure.png`) renders ATR-tolerance clustered horizontal zones, POC, and volume-by-price. The following extensions are pending.

### 추세선 (Trendline) overlay — opt-in
Earlier v1 implementation connected swing pivots with diagonal trendlines. v2 removed these because price-extreme selection (top/bottom 2 by price) produced misleading lines in strong trends. A re-introduction should:
- Be **opt-in** (e.g., CLI flag `--trendline` or theme variant), not the default.
- Use **temporal pivot selection** (most recent 2–3 swing highs / swing lows by index) rather than price extremes.
- Optionally filter for **higher-highs / lower-lows** sequence to draw only confirmed trend direction.
- Co-exist with the horizontal zone overlay (different color / dashed style so the two don't visually collide).

### 파동이론 (Elliott Wave) detection + annotation
Add a wave-counting overlay to the structure chart:
- Detect impulse (5-wave) and corrective (3-wave: A-B-C) structures from the swing pivot sequence.
- Fibonacci-based ratio checks (wave 3 ≥ 1.618 of wave 1, wave 4 not overlapping wave 1, etc.).
- Annotate detected waves with labels (1, 2, 3, 4, 5 / A, B, C) at the corresponding pivots.
- Output a sibling CSV summarizing wave structure with confidence score.
- This is complex — start with **single completed impulse on the most recent dominant trend** before attempting nested degrees.

### Other ideas (lower priority)
- CLI flag for distance filter percentage (currently hard-coded `MAX_ZONE_DISTANCE_PCT = 0.30`).
- CLI flag for swing window `k` (currently 5) to control pivot sensitivity per ticker.
- Higher-resolution rendering (currently 1600x1080) for portrait/mobile memos.
