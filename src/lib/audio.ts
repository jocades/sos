import type { Bar } from "./types"

const audioCtx = new AudioContext()

const channels: { osc: OscillatorNode; gain: GainNode }[] = []

function triangle() {
  const osc = audioCtx.createOscillator()
  const real = Array.from({ length: 8192 }, () => 0)
  const imag = real.map((_, i) => {
    if (i === 0) return 0
    return (8 * Math.sin((i * Math.PI) / 2)) / Math.pow(Math.PI * i, 2)
  })
  const wave = audioCtx.createPeriodicWave(Float32Array.from(real), Float32Array.from(imag))
  osc.setPeriodicWave(wave)
  return osc
}

function createChannel() {
  const osc = triangle()
  const gain = audioCtx.createGain()
  gain.gain.value = 0
  osc.connect(gain).connect(audioCtx.destination)
  osc.start()
  return { osc, gain }
}

export function setupAudio() {
  channels.push(createChannel())
  channels.push(createChannel())
  console.log("Start oscillators")
}

function play(ch: 1 | 2, freq: number, when: number, duration: number) {
  const { osc, gain } = channels[ch - 1]
  osc.frequency.setValueAtTime(freq, when)
  gain.gain.cancelScheduledValues(when)
  gain.gain.setValueAtTime(0.25, when)
  // gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  gain.gain.setValueAtTime(0, when + duration)
}

export function tone(bars: Bar[], [i, j]: number[], duration = 0.05) {
  if (audioCtx.state !== "running") return

  const now = audioCtx.currentTime
  if (i !== undefined) play(1, bars[i].freq, now, duration)
  if (j !== undefined) play(2, bars[j].freq, now, duration)
}
