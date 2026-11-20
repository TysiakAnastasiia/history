let ac: AudioContext | null = null
function beep(f: number, d: number, type: OscillatorType, v: number, s: number) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ac = ac || new Ctx()
    const o = ac.createOscillator(),
      g = ac.createGain(),
      t = ac.currentTime + s
    o.type = type
    o.frequency.value = f
    g.gain.setValueAtTime(v, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + d)
    o.connect(g)
    g.connect(ac.destination)
    o.start(t)
    o.stop(t + d)
  } catch {
    /* звук необов’язковий */
  }
}
export function playResult(ok: boolean, enabled: boolean) {
  if (!enabled) return
  if (ok) [523, 659, 784].forEach((f, i) => beep(f, 0.2, 'triangle', 0.15, i * 0.09))
  else {
    beep(180, 0.35, 'sawtooth', 0.08, 0)
    beep(130, 0.4, 'sawtooth', 0.08, 0.18)
  }
}
