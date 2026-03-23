// Fetch major Maine rivers from USGS NHD ArcGIS REST service (layer 6, large scale flowlines)
// Queries by name so we get exactly the rivers we want

const https = require('https');
const fs = require('fs');

const RIVERS = [
  'Penobscot River',
  'Kennebec River',
  'Androscoggin River',
  'St. John River',
  'Aroostook River',
  'Allagash River',
  'Machias River',
  'Saco River',
  'Presumpscot River',
  'St. Croix River',
  'Union River',
  'Sheepscot River',
  'East Branch Penobscot River',
  'West Branch Penobscot River',
  'Dead River',
  'Sandy River',
  'Ossipee River',
  'Mousam River',
];

const WHERE = RIVERS.map(r => "gnis_name = '" + r + "'").join(' OR ');

const BASE = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/6/query';

async function fetchPage(offset) {
  const params = new URLSearchParams({
    where: WHERE,
    geometry: '-71.09,42.96,-66.88,47.46',
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outFields: 'gnis_name,ftype,fcode',
    outSR: '4326',
    resultOffset: offset,
    resultRecordCount: 2000,
    f: 'geojson'
  });

  const url = BASE + '?' + params.toString();
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const allFeatures = [];
  let offset = 0;
  console.log('Fetching named Maine rivers from NHD large-scale flowlines...');
  while (true) {
    console.log('  offset', offset);
    const page = await fetchPage(offset);
    if (page.error) { console.error('API error:', page.error); break; }
    const features = page.features || [];
    allFeatures.push(...features);
    console.log('  got', features.length, '(total:', allFeatures.length + ')');
    if (features.length < 2000) break;
    offset += 2000;
  }

  const names = [...new Set(allFeatures.map(f => f.properties.gnis_name).filter(Boolean))].sort();
  console.log('\nRivers found (' + names.length + '):', names.join(', '));

  const geojson = { type: 'FeatureCollection', features: allFeatures };
  fs.writeFileSync('rivers_raw.geojson', JSON.stringify(geojson));
  console.log('\nSaved rivers_raw.geojson (' + allFeatures.length + ' features)');
  console.log('Size: ' + (fs.statSync('rivers_raw.geojson').size / 1024).toFixed(0) + ' KB');
}

main().catch(console.error);
