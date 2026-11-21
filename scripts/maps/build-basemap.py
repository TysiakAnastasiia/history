# Збирає основу історичних карт із даних Natural Earth (суспільне надбання, naturalearthdata.com).
# Результат: src/maps/basemap.ts — суходіл, озера й річки у вигляді SVG-шляхів.
#
# Запуск (один раз або коли змінюються межі карти):
#   1) завантажити в окрему теку:
#      ne_50m_land.geojson, ne_10m_lakes.geojson, ne_10m_rivers_lake_centerlines.geojson
#      з https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
#   2) python -I scripts/maps/build-basemap.py <тека з geojson> src/maps/basemap.ts
import json, math, os, sys

# Межі карти (довгота/широта) і проєкція — мають збігатися з src/maps/geo.ts
LON_MIN, LON_MAX, LAT_MIN, LAT_MAX = 20.5, 50.5, 40.3, 61.5
K = 30  # пікселів на градус широти
COS = math.cos(math.radians(50))
PAD = 1.0  # запас за межами, щоб не було видно обрізаних країв

# Природні річки й озера, що знадобляться для історичних карт (без сучасних водосховищ)
RIVERS = {
    'Dnipro': 'Дніпро', 'Dnepre': 'Дніпро', 'Dniester': 'Дністер', 'Southern Bug': 'Південний Буг',
    'Prut': 'Прут', 'Danube': 'Дунай', 'Bratul Chillia': 'Дунай', 'Bratul Sfintu Gheorghe': 'Дунай',
    'Bratul Sulina': 'Дунай', 'Desna': 'Десна', 'Pripyat': 'Прип’ять', 'Bug': 'Західний Буг',
    'Don': 'Дон', 'Donets': 'Сіверський Донець', 'Volga': 'Волга', 'Oka': 'Ока', 'Daugava': 'Західна Двіна',
    'Neva': 'Нева', 'Volkhov': 'Волхов', 'Svir': 'Свір', 'Seym': 'Сейм', 'Vistula': 'Вісла',
    'Neman': 'Німан', 'Kuban': 'Кубань', 'Narva': 'Нарва', 'Velikaya': 'Велика', 'Msta': 'Мста',
}
LAKES = {'Lake Ladoga': 'Ладозьке озеро', 'Lake Onega': 'Онезьке озеро',
         'Lake Peipus': 'Чудське озеро', 'Lake Pskov': 'Псковське озеро'}
# Ільменя немає в Natural Earth 10m — малюємо спрощений контур вручну (довгота, широта)
ILMEN = [(31.0, 58.45), (31.3, 58.42), (31.65, 58.3), (31.75, 58.15), (31.55, 58.05),
         (31.2, 58.08), (30.95, 58.2), (30.95, 58.35), (31.0, 58.45)]


def proj(lon, lat):
    return ((lon - LON_MIN) * K * COS, (LAT_MAX - lat) * K)


def clamp(p):
    return (min(max(p[0], LON_MIN - PAD), LON_MAX + PAD), min(max(p[1], LAT_MIN - PAD), LAT_MAX + PAD))


def inside(p):
    return LON_MIN - PAD <= p[0] <= LON_MAX + PAD and LAT_MIN - PAD <= p[1] <= LAT_MAX + PAD


def simplify(pts, tol):
    """Дуглас — Пекер: прибирає зайві точки, зберігаючи форму лінії."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy)
        best, idx = 0.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            # кінці збігаються (замкнений контур) — беремо відстань до точки, інакше до прямої
            d = (abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm if norm > 1e-9
                 else math.hypot(px - x1, py - y1))
            if d > best:
                best, idx = d, i
        if best > tol:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]


def path(rings, closed):
    out = []
    for ring in rings:
        xy = [proj(*p) for p in ring]
        if len(xy) < 2:
            continue
        s = 'M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in xy)
        out.append(s + ('Z' if closed else ''))
    return ''.join(out)


def polygons(geom):
    if geom['type'] == 'Polygon':
        return [geom['coordinates']]
    if geom['type'] == 'MultiPolygon':
        return geom['coordinates']
    return []


def lines(geom):
    if geom['type'] == 'LineString':
        return [geom['coordinates']]
    if geom['type'] == 'MultiLineString':
        return geom['coordinates']
    return []


def area_rings(features, tol, keep_feature=lambda p: True):
    rings = []
    for ft in features:
        if not keep_feature(ft['properties']):
            continue
        for poly in polygons(ft['geometry']):
            outer = poly[0]
            if not any(inside(p) for p in outer):
                continue
            ring = simplify([clamp(p) for p in outer], tol)
            if len(ring) >= 4:
                rings.append(ring)
    return rings


def main(src, dst):
    load = lambda n: json.load(open(os.path.join(src, n), encoding='utf-8'))['features']
    land = area_rings(load('ne_50m_land.geojson'), 0.02)
    lakes_named = {}
    for ft in load('ne_10m_lakes.geojson'):
        p = ft['properties']
        name = LAKES.get(p.get('name') or '')
        if not name or p.get('featurecla') != 'Lake':
            continue
        for poly in polygons(ft['geometry']):
            ring = simplify(poly[0], 0.015)
            if any(inside(q) for q in ring):
                lakes_named.setdefault(name, []).append(ring)

    lakes_named['Ільмень'] = [ILMEN]

    rivers = {}
    for ft in load('ne_10m_rivers_lake_centerlines.geojson'):
        name = RIVERS.get(ft['properties'].get('name') or '')
        if not name:
            continue
        for line in lines(ft['geometry']):
            seg = []
            for p in line + [None]:
                if p is not None and inside(p):
                    seg.append(p)
                    continue
                if len(seg) > 1:
                    rivers.setdefault(name, []).append(simplify(seg, 0.01))
                seg = []

    width, height = proj(LON_MAX, LAT_MIN)
    data = {
        'width': round(width, 1),
        'height': round(height, 1),
        'land': path(land, True),
        'lakes': [{'name': n, 'd': path(r, True)} for n, r in lakes_named.items()],
        'rivers': [{'name': n, 'd': path(r, False)} for n, r in rivers.items()],
    }
    with open(dst, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Згенеровано scripts/maps/build-basemap.py з даних Natural Earth (суспільне надбання).\n')
        f.write('// Не редагувати вручну.\n')
        f.write('export const BASEMAP = ')
        f.write(json.dumps(data, ensure_ascii=False))
        f.write(' as const\n')
    print('land rings', len(land), '| lakes', list(lakes_named), '| rivers', len(rivers),
          '| size', os.path.getsize(dst), 'bytes')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
