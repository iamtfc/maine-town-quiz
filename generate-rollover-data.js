// Generates maine-rollover.geojson — a simplified, combined file for the rollover map.
// Run with: node generate-rollover-data.js

const fs = require('fs');

const COUNTIES = [
  'androscoggin','aroostook','cumberland','franklin','hancock',
  'kennebec','knox','lincoln','oxford','penobscot','piscataquis',
  'sagadahoc','somerset','waldo','washington','york'
];

const ALWAYS_EXCLUDE = new Set([
  'Hancock County Island','Knox County Island','Lincoln County Island',
  'Piscataquis County Island','Waldo County Island','Washington County Island',
]);
const ALWAYS_INCLUDE = new Set([
  'Matinicus Isle Plt','Monhegan Island Plt','Rangeley Plt',
  'The Forks Plt','Grand Lake Stream Plt',
]);
const NORMAL_MODE_EXCLUDE = new Set([
  'Township 6 North of Weld','Township D','Township E',
  'C Surplus','Township C',
  'Rockwood Strip T1 R1 NBKP','Rockwood Strip T2 R1 NBKP',
]);

function shouldInclude(f) {
  const name = (f.properties.TOWN || '').trim();
  if (!name) return false;
  if (f.properties.LAND === 'n') return false;
  if (ALWAYS_INCLUDE.has(name)) return true;
  if (ALWAYS_EXCLUDE.has(name)) return false;
  const upper = name.toUpperCase();
  if (/UNORG|PATENT/.test(upper)) return false;
  if (NORMAL_MODE_EXCLUDE.has(name)) return false;
  if (/WELS/.test(upper)) return false;
  if (/ TWP$| TWP | TOWNSHIP| PLT$| PLT | PLANTATION|GRANT TWP|GRANT$/.test(upper)) return false;
  if (/^T[A-Z0-9]+ R[A-Z0-9]+/.test(upper)) return false;
  if (/^T\d+\s/.test(upper)) return false;
  if (/SURPLUS$/.test(upper)) return false;
  return true;
}

// Douglas-Peucker simplification on a ring of [lng, lat] points
function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.sqrt(dx*dx + dy*dy);
  if (len === 0) return Math.sqrt((p[0]-a[0])**2 + (p[1]-a[1])**2);
  return Math.abs(dy*p[0] - dx*p[1] + b[0]*a[1] - b[1]*a[0]) / len;
}

function simplify(pts, tol) {
  if (pts.length <= 2) return pts;
  let maxD = 0, maxI = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length-1]);
    if (d > maxD) { maxD = d; maxI = i; }
  }
  if (maxD > tol) {
    const L = simplify(pts.slice(0, maxI+1), tol);
    const R = simplify(pts.slice(maxI), tol);
    return [...L.slice(0,-1), ...R];
  }
  return [pts[0], pts[pts.length-1]];
}

const TOLERANCE = 0.0008; // ~80m — invisible at state overview scale
const PRECISION = 5;      // decimal places for coordinates

function roundCoord(c) {
  const f = 10 ** PRECISION;
  return [Math.round(c[0]*f)/f, Math.round(c[1]*f)/f];
}

function simplifyRing(ring) {
  const s = simplify(ring, TOLERANCE);
  // Ensure ring is closed and has at least 4 points
  const result = s.map(roundCoord);
  if (result.length < 4) return ring.map(roundCoord); // fallback
  result[result.length-1] = result[0]; // close
  return result;
}

function simplifyGeometry(geom) {
  if (geom.type === 'Polygon') {
    return { ...geom, coordinates: geom.coordinates.map(simplifyRing) };
  } else if (geom.type === 'MultiPolygon') {
    return { ...geom, coordinates: geom.coordinates.map(poly => poly.map(simplifyRing)) };
  }
  return geom;
}

// Collect all quiz features, grouped by town name
const townGroups = {};
for (const county of COUNTIES) {
  const data = JSON.parse(fs.readFileSync(`${county}.geojson`, 'utf8'));
  const kept = data.features.filter(shouldInclude);
  for (const f of kept) {
    const name = f.properties.TOWN;
    if (!townGroups[name]) townGroups[name] = { county: f.properties.COUNTY, polys: [] };
    const geom = simplifyGeometry(f.geometry);
    if (geom.type === 'Polygon') {
      townGroups[name].polys.push(geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      townGroups[name].polys.push(...geom.coordinates);
    }
  }
  process.stdout.write(`${county} `);
}
console.log();

// Merge each town's polygons into a single feature
const mergedFeatures = Object.entries(townGroups).map(([town, { county, polys }]) => ({
  type: 'Feature',
  properties: { TOWN: town, COUNTY: county },
  geometry: polys.length === 1
    ? { type: 'Polygon', coordinates: polys[0] }
    : { type: 'MultiPolygon', coordinates: polys }
}));

const out = { type: 'FeatureCollection', features: mergedFeatures };
const json = JSON.stringify(out);
fs.writeFileSync('maine-rollover.geojson', json);

const mb = (json.length / 1024 / 1024).toFixed(2);
console.log(`Wrote maine-rollover.geojson — ${mergedFeatures.length} towns, ${mb} MB`);
