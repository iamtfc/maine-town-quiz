# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-page browser quiz game where users identify Maine towns on a map by clicking on the correct county polygon. No build step, no dependencies to install — open `maine-quiz-mvp.html` directly in a browser (or serve it with a local HTTP server since it fetches `.geojson` files via `fetch()`).

**Live site:** https://iamtfc.github.io/maine-town-quiz/maine-quiz-mvp.html

## Running locally

Because `loadCounty()` uses `fetch('./filename.geojson')`, the file must be served over HTTP, not opened as a `file://` URL. Any static server works:

```bash
python -m http.server 8080
# then open http://localhost:8080/maine-quiz-mvp.html
```

## Architecture

Everything lives in `maine-quiz-mvp.html` — CSS, HTML, and JavaScript are all inline in one file. There is no framework, no bundler, and no separate JS modules.

**External dependency:** D3 v7 loaded from CDN (`cdnjs.cloudflare.com`).

**Data:** One `.geojson` file per Maine county (16 total), named `{county_lowercase}.geojson`. Each file contains polygon features with a `TOWN` property. Features are filtered on load to exclude unorganized territories, townships, plantations, patents, and grants.

**Quiz flow:**
1. `showPicker()` — county selection screen
2. `loadCounty(county)` — fetches the county's GeoJSON, filters features, calls `buildMap()` then `startQuiz()`
3. `buildMap()` — uses D3's `geoMercator` + `geoPath` to render SVG polygons; each polygon gets a `click` handler
4. `startQuiz()` — shuffles town names into `order[]`, resets state, calls `showQuestion()`
5. `handleClick(event, d)` — compares clicked town to `order[current]`; marks correct/wrong/reveal CSS classes; shows feedback
6. `nextQuestion()` / `showResults()` — advances through the shuffled list, then shows score screen

**Key global state:** `towns[]`, `features[]`, `order[]`, `current`, `score`, `answered`, `currentCounty`, `svg`, `path`

## GeoJSON data notes

- Property keys: `TOWN`, `COUNTY`, `TYPE`, `ISLAND`, `LAND`
- Source: Maine GIS non-dissolved polygon boundary file (coastal detail preserved); dissolved version exists but is too featureless
- The filter regex in `loadCounty()` controls which features appear as clickable towns — excludes unorganized territories, townships, plantations, patents, grants
- Coastal counties (Knox, Lincoln, Hancock, Sagadahoc, Cumberland especially) have large file sizes due to coastal detail; Knox and Washington are the heaviest at ~6.5 MB and ~9.7 MB
- Future work: water masking (diff dissolved vs. non-dissolved to create a water overlay layer), geometry simplification for large files, hard mode using unorganized territories (plan: tag with `HARD_MODE: true` property rather than filtering them out)
