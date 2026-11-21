// Проєкція історичних карт. Константи мають збігатися з scripts/maps/build-basemap.py.
import type { LonLat } from '../lib/schema'

const LON_MIN = 20.5
const LAT_MAX = 61.5
const K = 30
const COS = Math.cos((50 * Math.PI) / 180)

export type XY = [number, number]

/** Довгота/широта → координати SVG основи карти */
export const project = ([lon, lat]: LonLat): XY => [(lon - LON_MIN) * K * COS, (LAT_MAX - lat) * K]

/** Межі показу [лон мін, лат мін, лон макс, лат макс] → viewBox */
export function viewBox([lonMin, latMin, lonMax, latMax]: [number, number, number, number]) {
  const [x1, y1] = project([lonMin, latMax])
  const [x2, y2] = project([lonMax, latMin])
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

const f = (n: number) => n.toFixed(1)

/** Плавна крива через точки (Catmull-Rom → кубічні Безьє); closed — замкнена область */
export function smoothPath(points: LonLat[], closed: boolean): string {
  const p = points.map(project)
  const n = p.length
  if (n < 2) return ''
  const at = (i: number) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))])
  let d = `M${f(p[0][0])} ${f(p[0][1])}`
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1: XY = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: XY = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return closed ? d + 'Z' : d
}

/** Центр області для підпису */
export function centroid(points: LonLat[]): LonLat {
  const lon = points.reduce((s, q) => s + q[0], 0) / points.length
  const lat = points.reduce((s, q) => s + q[1], 0) / points.length
  return [lon, lat]
}

/** Підписи головних річок на основі карти */
export const RIVER_LABELS: { name: string; at: LonLat; angle: number }[] = [
  { name: 'Дніпро', at: [31.6, 49.25], angle: -28 },
  { name: 'Дністер', at: [27.3, 48.3], angle: -30 },
  { name: 'Південний Буг', at: [29.6, 48.1], angle: -55 },
  { name: 'Десна', at: [32.6, 51.95], angle: -15 },
  { name: 'Прип’ять', at: [27.2, 51.75], angle: 0 },
  { name: 'Дунай', at: [26.0, 43.85], angle: 0 },
  { name: 'Дон', at: [40.4, 49.3], angle: -60 },
  { name: 'Волга', at: [46.6, 50.6], angle: -60 },
  { name: 'Ока', at: [40.8, 54.9], angle: 0 },
]

export const SEA_LABELS: { name: string; at: LonLat }[] = [
  { name: 'Чорне море', at: [33.5, 43.3] },
  { name: 'Азовське море', at: [36.6, 46.15] },
  { name: 'Балтійське море', at: [21.8, 58.3] },
]
