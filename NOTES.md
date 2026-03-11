# Maine Towns Quiz — Project Notes

## What This Is
A web-based geography quiz where users identify Maine towns by clicking on a map. No labels on the map — just town boundary shapes. Built with vanilla HTML/CSS/JS and D3.js.

**Live URL:** https://iamtfc.github.io/maine-town-quiz/maine-quiz-mvp.html

---

## Current State
- County picker screen → click a county → quiz loads
- Shows all towns in the county as clickable shapes
- Prompt says "Click on [Town Name]"
- Green = correct, red = wrong, orange = correct answer revealed
- Goes through all towns in the county, then shows % score
- Results screen has "Try Again" and "Choose Another County" buttons

---

## Data Files
- One GeoJSON per county, named e.g. `cumberland.geojson`, `aroostook.geojson`
- All 16 county files are in the repo
- Source: Maine GIS polygon boundary file (non-dissolved version for coastal detail)
- Key property fields: `TOWN`, `COUNTY`, `TYPE`, `ISLAND`, `LAND`
- `cumberland_full.geojson` is an older file — the individual county files are the ones in use

---

## Known Issues / To Do

### High Priority
- [ ] **Unorganized territory filter** — needs to be applied to all 16 counties, not just caught case by case. Current filter in JS catches most but not all. Pattern: filter out anything with `Twp`, `Plt`, `WELS`, `Patent`, `T## R##` style names
- [ ] **Hard mode** — preserve unorganized territories/townships for a future hard mode. Instead of deleting them from files, add a `HARD_MODE: true` property to each feature so the quiz can filter by mode
- [ ] **Water rendering** — coastal town polygons include water within their boundaries, making it possible to click "ocean" and get it right. Fix approach: use the dissolved boundary files as a land mask against the detailed polygons to generate a water overlay layer. Maine has a lot of coast so this is important (Knox, Lincoln, Hancock, Sagadahoc, Cumberland especially)

### Medium Priority
- [ ] **Geometry simplification** — Knox (6.45MB) and Washington (9.72MB) are large. Simplify coordinates to reduce file sizes without visible quality loss
- [ ] **Caching** — cache loaded county GeoJSON in memory so switching counties and back doesn't re-fetch
- [ ] **County-by-county QA** — play through each county and note any display or data issues. Cumberland is the baseline that works correctly

### Low Priority / Future
- [ ] **Hard mode UI** — toggle to include unorganized territories in the quiz
- [ ] **All Maine mode** — quiz on all 492 municipalities at once
- [ ] **Score history** — track performance over time

---

## Architecture Notes
- Pure static site — HTML + GeoJSON files, no backend needed
- Hosted on GitHub Pages (free, scales fine for a static quiz)
- D3.js v7 for map projection and SVG rendering
- Fonts: Playfair Display + Crimson Pro (Google Fonts)
- Color scheme: deep ocean navy background, gold accents, parchment text

---

## Water Masking Approach (to implement later)
The plan is to diff the dissolved boundary polygons against the detailed polygons to create a water layer:
1. Dissolved polygons = clean land shapes (smaller file, no coastal detail)
2. Detailed polygons = full shapes including water within town boundaries
3. Subtract dissolved from detailed → produces water areas
4. Render water layer on top of town shapes in ocean blue

Maine GIS has both versions. The dissolved file was the first one we tried but was too featureless. The detailed non-dissolved file is what we're using now.

---

## File Structure
```
maine-town-quiz/
├── maine-quiz-mvp.html      # Main quiz file
├── cumberland.geojson       # Old dissolved version (can delete)
├── cumberland_full.geojson  # Old pre-split file (can delete)
├── androscoggin.geojson
├── aroostook.geojson
├── cumberland.geojson
├── franklin.geojson
├── hancock.geojson
├── kennebec.geojson
├── knox.geojson
├── lincoln.geojson
├── oxford.geojson
├── penobscot.geojson
├── piscataquis.geojson
├── sagadahoc.geojson
├── somerset.geojson
├── waldo.geojson
├── washington.geojson
└── york.geojson
```

---

## County File Sizes (for reference)
| County | Features | Size |
|--------|----------|------|
| Androscoggin | 14 | 0.25 MB |
| Aroostook | 177 | 1.73 MB |
| Cumberland | 925 | 6.12 MB |
| Franklin | 49 | 0.78 MB |
| Hancock | 1190 | 7.17 MB |
| Kennebec | 55 | 0.70 MB |
| Knox | 1675 | 6.45 MB |
| Lincoln | 797 | 4.52 MB |
| Oxford | 55 | 0.68 MB |
| Penobscot | 112 | 1.41 MB |
| Piscataquis | 386 | 2.12 MB |
| Sagadahoc | 821 | 3.62 MB |
| Somerset | 119 | 2.71 MB |
| Waldo | 89 | 1.04 MB |
| Washington | 1688 | 9.72 MB |
| York | 266 | 2.83 MB |
