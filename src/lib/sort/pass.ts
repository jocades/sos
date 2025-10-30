import type { Bar, SortGenerator } from "../types"

export function* pass(bars: Bar[]): SortGenerator {
  for (let i = 0; i < bars.length; i++) {
    yield { read: [i], sound: [i] }
  }
}
