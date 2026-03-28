# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A browser-based quiz game where users identify Maine towns on a map. Three difficulty tiers, all single-file with no build step — serve with a local HTTP server since files fetch `.geojson` data via `fetch()`.

**Live site:** https://iamtfc.github.io/maine-town-quiz/

## Files

- **`index.html`** — Main town quiz (Normal Mode). County picker → click towns on map.
- **`maine-quiz-image.html`** — Challenge Mode. Type town names; unlocked by scoring 100% on a county in Normal Mode.
- **`maine-quiz-counties.html`** — County learning quiz. Click the correct county on a map of all 16 Maine counties.
- **`stats.html`** — Progress dashboard. County grid with best scores, score history chart, town accuracy heat map.

## Running locally

Because `loadCounty()` uses `fetch('./filename.geojson')`, files must be served over HTTP, not opened as `file://` URLs. Any static server works:

```bash
python -m http.server 8080
# then open http://localhost:8080/
```

## Architecture

Everything is inline (CSS, HTML, JS) in each file. No framework, no bundler, no separate JS modules.

**External dependency:** D3 v7 loaded from CDN (`cdnjs.cloudflare.com`).

**Analytics:** Plausible (privacy-friendly). Custom events: `County Started` (props: `county`, `mode`), `County Completed` (props: `county`, `score`, `mode`), `Challenge Started` (props: `county`).

## Quiz flow (index.html)

1. `showPicker()` — county selection screen with interactive map
2. `loadCounty(county)` — fetches county GeoJSON, filters features, builds map and starts quiz
3. `buildMap()` — D3 `geoMercator` + `geoPath` renders SVG layers: background rect → land layer (`allLandFeatures`) → town polygons → lakes → rivers
4. `startQuiz()` — shuffles town names into `order[]`, resets state
5. `handleClick(event, d)` — compares clicked town to `order[current]`; applies correct/wrong/reveal CSS classes
6. `nextQuestion()` / `showResults()` — advances through list, then shows score screen with stats

**Key global state:** `towns[]`, `features[]`, `allLandFeatures[]`, `order[]`, `current`, `score`, `answered`, `currentCounty`, `svg`, `path`

## Town filtering

Filtering logic is duplicated across `index.html`, `maine-quiz-image.html`, and `stats.html` — if rules change, update all three.

- `ALWAYS_EXCLUDE` — county-level island artifacts (e.g. "Knox County Island")
- `ALWAYS_INCLUDE` — real inhabited islands that would otherwise be excluded by regex
- `NORMAL_MODE_EXCLUDE` — unorganized territories, townships, plantations, patents, grants (excluded by regex on `TOWN` name and `TYPE` property)
- `LAND === 'n'` features are always excluded (water polygons)
- `allLandFeatures` (all `LAND === 'y'`) renders as a dark background layer; quiz-eligible towns render on top, making excluded territories visible in a darker shade

## Stats & localStorage

All stats stored under key `maineQuizStats`. Structure:
```
{
  countyBest: { [county]: pct },         // normal mode best %
  countyGames: { [county]: [...] },      // normal mode game history (last 5)
  challengeBest: { [county]: pct },      // challenge mode best %
  challengeGames: { [county]: [...] },   // challenge mode game history (last 5)
  townStats: { [town]: { seen, correct } }
}
```
Game records: `{ ts: Date.now(), answers: [{ town, correct }] }`. Old records (flat arrays) handled via `gameAnswers(game)` helper: `game.answers || game`.

## GeoJSON data notes

- Property keys: `TOWN`, `COUNTY`, `TYPE`, `ISLAND`, `LAND`
- Source: Maine GIS non-dissolved polygon boundary file (coastal detail preserved)
- `counties.geojson` — dissolved county outlines, used by `maine-quiz-counties.html`
- Coastal counties have large file sizes due to coastal detail; Knox (~6.5 MB) and Washington (~9.7 MB) are the heaviest
- Future work: geometry simplification for large files, water masking overlay

## Planned: Maine Town Knowledge Tracker

A stat on `stats.html` showing overall progress toward knowing all Maine towns. Definition of "knowing" a town:
- You've answered it correctly 75% or more of the time across all attempts, OR
- You've scored 100% on its county (bulk-counts all towns in that county as known)

Display: something like "You know X of Y Maine towns" with a percentage or progress bar.

Implementation notes:
- `townStats[town]` already tracks `{ seen, correct }` — use this for the 75% threshold
- `countyBest[county] === 100` indicates a perfected county — all its towns count as known
- Denominator is all quiz-eligible towns (those passing `shouldInclude()`), excluding Gores — knowing a Gore feels like a bonus, not a requirement
- The two rules should be OR'd — a town counts if either condition is met

## Planned: Curated Challenges

A future `challenges.html` page where players can browse and attempt themed challenges — e.g. "Find all towns with 'Port' in the name", "Match towns with their New England namesakes (Portland / New Portland)", "Towns named after foreign countries".

**Data:** A `challenges.json` file defining each challenge with a name, description, and either a filter rule (algorithmic, e.g. name contains "Port") or an explicit curated town list. Some challenges can be computed from town names; others (countries, presidents, etc.) require hand-curation.

**Gameplay:** Likely a full-state map showing only the matching towns, rather than county-by-county. Matching/pairing challenges (Portland ↔ New Portland) may need a different interaction model than map-clicking.

**Access:** Available from the start — not locked behind county progression. These are a different dimension of the game, not a harder difficulty tier.

## Planned: Advanced Mode

A future difficulty tier beyond Challenge Mode would include currently-excluded places (unorganized territories, named wilderness areas, etc.). The intended approach:

- Tag eligible features with `HARD_MODE: true` directly in the GeoJSON rather than inferring inclusion from name/type patterns
- This gives precise control — not all excluded places are equally guessable; some (Baxter State Park area, Rangeley Lakes region) are recognizable, others are obscure survey artifacts
- Filter logic becomes explicit: normal/challenge use `shouldInclude(f)`, advanced adds `|| f.properties.HARD_MODE === true`
- Work required: review excluded features county by county and tag the ones worth including; this only needs to happen once per county
