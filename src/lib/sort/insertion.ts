import type { Bar, SortGenerator } from "../types"

export function* insertion(bars: Bar[]): SortGenerator {
  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i]
    let j
    for (j = i - 1; j >= 0 && bars[j].value > cur.value; j--) {
      bars[j + 1] = bars[j]
      yield { read: [i, j], sound: [j] }
    }
    bars[j + 1] = cur
    yield { read: [i, j + 1], sound: [i] }
  }
}
