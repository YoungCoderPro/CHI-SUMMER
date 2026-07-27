#!/usr/bin/env python3
"""
gpx_to_geojson.py
------------------
Merge every .gpx file in a folder (e.g. your unzipped Strava bulk export's
"activities" folder) into ONE data/streets.geojson for the Chicago Summer map.

Usage:
    python3 tools/gpx_to_geojson.py <gpx_folder> <output.geojson> [tolerance]

    tolerance (optional) = simplification strength in degrees.
        0            → keep every single GPS point (huge file, slow map)
        0.00003      → ~3 m  (very high fidelity)
        0.00002      → ~2 m  (DEFAULT — street-level fidelity, ~20x smaller)
        0.0002       → ~20 m (tiny file, slightly angular corners)

Examples:
    python3 tools/gpx_to_geojson.py ~/Downloads/activities data/streets.geojson
    python3 tools/gpx_to_geojson.py ~/Downloads/activities data/streets.geojson 0.00003

No internet connection or pip installs required — standard library only.

What it does:
  - Reads every .gpx (and gzipped .gpx.gz) in the folder, recursively.
  - Pulls out each track's lat/lng points.
  - Simplifies each track with Ramer-Douglas-Peucker so the map stays fast.
  - Writes one GeoJSON FeatureCollection, one LineString per walk, each
    carrying its activity name so the map can label it on hover.
  - Skips files with no GPS points (e.g. manually-entered activities).

Re-run any time you have new walks — it always rebuilds fresh from whatever
GPX files are in the folder, so just drop new exports in and run it again.
"""
import sys, os, gzip, glob, json, math
import xml.etree.ElementTree as ET

DEFAULT_TOLERANCE = 0.00002  # ~2 metres — street-level fidelity, fast map


# ---------- Ramer-Douglas-Peucker line simplification ----------
def _perp_dist(pt, start, end):
    """Perpendicular distance from pt to the line start->end (in degrees)."""
    if start == end:
        return math.hypot(pt[0] - start[0], pt[1] - start[1])
    x0, y0 = pt
    x1, y1 = start
    x2, y2 = end
    num = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
    den = math.hypot(y2 - y1, x2 - x1)
    return num / den if den else 0.0


def simplify(points, tolerance):
    """Iterative RDP — avoids recursion limits on 25k-point tracks."""
    if tolerance <= 0 or len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        if last <= first + 1:
            continue
        max_d, idx = -1.0, first
        for i in range(first + 1, last):
            d = _perp_dist(points[i], points[first], points[last])
            if d > max_d:
                max_d, idx = d, i
        if max_d > tolerance:
            keep[idx] = True
            stack.append((first, idx))
            stack.append((idx, last))
    return [p for p, k in zip(points, keep) if k]


# ---------- GPX parsing ----------
def parse_gpx_bytes(data, source_name, tolerance):
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return None

    # Namespace-agnostic: match by local tag name, since GPX exporters vary.
    def local(tag):
        return tag.split("}")[-1] if "}" in tag else tag

    coords = []
    for trkpt in (e for e in root.iter() if local(e.tag) == "trkpt"):
        lat, lon = trkpt.get("lat"), trkpt.get("lon")
        if lat and lon:
            coords.append((float(lon), float(lat)))
    if not coords:
        for rtept in (e for e in root.iter() if local(e.tag) == "rtept"):
            lat, lon = rtept.get("lat"), rtept.get("lon")
            if lat and lon:
                coords.append((float(lon), float(lat)))
    if len(coords) < 2:
        return None

    raw_n = len(coords)
    coords = simplify(coords, tolerance)
    # round to ~1 m precision to shrink the file further
    coords = [[round(x, 5), round(y, 5)] for x, y in coords]

    name_el = next((e for e in root.iter() if local(e.tag) == "name"), None)
    fallback = os.path.splitext(os.path.basename(source_name))[0].replace("_", " ")
    name = (name_el.text.strip() if name_el is not None and name_el.text else fallback)

    return {
        "type": "Feature",
        "properties": {
            "name": name,
            "source": os.path.basename(source_name),
            "points": len(coords),
        },
        "geometry": {"type": "LineString", "coordinates": coords},
    }, raw_n, len(coords)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    src_dir, out_path = sys.argv[1], sys.argv[2]
    tolerance = float(sys.argv[3]) if len(sys.argv) > 3 else DEFAULT_TOLERANCE

    files = sorted(
        glob.glob(os.path.join(src_dir, "**", "*.gpx"), recursive=True)
        + glob.glob(os.path.join(src_dir, "**", "*.gpx.gz"), recursive=True)
    )
    if not files:
        print(f"No .gpx or .gpx.gz files found under {src_dir}")
        sys.exit(1)

    features, skipped, raw_total, kept_total = [], 0, 0, 0
    for path in files:
        try:
            opener = gzip.open if path.endswith(".gz") else open
            with opener(path, "rb") as f:
                data = f.read()
            result = parse_gpx_bytes(data, path, tolerance)
            if result:
                feat, raw_n, kept_n = result
                features.append(feat)
                raw_total += raw_n
                kept_total += kept_n
            else:
                skipped += 1
        except Exception as e:
            print(f"  ! skipped {os.path.basename(path)}: {e}")
            skipped += 1

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f)

    size_kb = os.path.getsize(out_path) / 1024
    pct = (100 - kept_total / raw_total * 100) if raw_total else 0
    print(f"Wrote {len(features)} walk(s) → {out_path}")
    print(f"  {raw_total:,} GPS points → {kept_total:,} kept ({pct:.1f}% reduction)")
    print(f"  File size: {size_kb:,.0f} KB · tolerance {tolerance}")
    if skipped:
        print(f"  {skipped} file(s) skipped (no GPS data)")


if __name__ == "__main__":
    main()
