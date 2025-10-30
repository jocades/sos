import { customOscillators } from "web-audio-oscillators"
import type { Bar } from "./types"

const audioCtx = new AudioContext()

let osc1: OscillatorNode
let gain1: GainNode

let osc2: OscillatorNode
let gain2: GainNode

export async function setupAudio() {
  osc1 = customOscillators.triangle(audioCtx)
  gain1 = audioCtx.createGain()
  gain1.gain.value = 0
  osc1.connect(gain1).connect(audioCtx.destination)
  osc1.start()

  osc2 = customOscillators.triangle(audioCtx)
  gain2 = audioCtx.createGain()
  gain2.gain.value = 0
  osc2.connect(gain2).connect(audioCtx.destination)
  osc2.start()

  console.log("Start oscillators")
}

export function tone(bars: Bar[], [i, j]: number[], duration = 0.05) {
  if (audioCtx.state !== "running") return

  const now = audioCtx.currentTime

  if (i !== undefined) {
    osc1.frequency.setValueAtTime(bars[i].freq, now)
    gain1.gain.cancelScheduledValues(now)
    gain1.gain.setValueAtTime(0.25, now)
    // gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain1.gain.setValueAtTime(0, now + duration)
  }

  if (j !== undefined) {
    osc2.frequency.setValueAtTime(bars[j].freq, now)
    gain2.gain.cancelScheduledValues(now)
    gain2.gain.setValueAtTime(0.25, now)
    // gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    gain2.gain.setValueAtTime(0, now + duration)
  }
}
