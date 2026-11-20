export const shuffle = <T>(a: T[]): T[] =>
  a
    .map((x) => [Math.random(), x] as [number, T])
    .sort((p, q) => p[0] - q[0])
    .map((x) => x[1])
export const rnd = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
