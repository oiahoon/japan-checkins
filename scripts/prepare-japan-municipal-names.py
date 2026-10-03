"""Repair municipality labels from the pinned source, without changing polygons or IDs.

python3 scripts/prepare-japan-municipal-names.py /tmp/japan-municipal-source.json
Then: node scripts/build-place-index.mjs
"""
import hashlib
import json
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_bytes()
assert hashlib.sha256(source).hexdigest() == '8e38c250108fbf40a2307bd8a6ba905c0995e1511fcf83fdfab3318acbcbd4e8', 'Unexpected source version'
raw = json.loads(source)['features']
target = Path(__file__).resolve().parent.parent / 'public/japan-cities.json'
data = json.loads(target.read_text())
assert len(raw) == len(data['features']) == 1751
for i, (original, feature) in enumerate(zip(raw, data['features'])):
    props = original['properties']
    assert feature['properties']['id'] == i and feature['properties']['prefecture'] == props['N03_001']
    coords = original['geometry']['coordinates']
    coords = [coords] if original['geometry']['type'] == 'Polygon' else coords
    assert feature['geometry']['coordinates'] == [[[[round(v, 4) for v in pt] for pt in ring] for ring in poly] for poly in coords], 'Geometry drift'
    feature['properties']['name'] = props.get('N03_004') or props['N03_003']
    feature['properties']['municipalityCode'] = props['N03_007']
    if props.get('N03_004') and props.get('N03_003'):
        feature['properties']['county'] = props['N03_003']
target.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
