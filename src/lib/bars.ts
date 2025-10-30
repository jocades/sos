import type { Bar } from "./types"

export let bars: Bar[] = []

export function setBars(newBars: Bar[]) {
  bars = newBars
}

export function createBars(length: number) {
  return Array.from({ length }, (_, i) => ({
    value: i + 1,
    freq: 200 + ((i + 1) / length) * 800,
  }))
}
