import type { Bar, SortGenerator } from "../types"
import { swap } from "../util"

export function* bubble(bars: Bar[]): SortGenerator {
  for (let i = 0; i < bars.length; i++) {
    for (let j = 0; j < bars.length - i - 1; j++) {
      let write: number[] | undefined
      if (bars[j].value > bars[j + 1].value) {
        swap(bars, j, j + 1)
        write = [j, j + 1]
      }
      yield { read: [j, j + 1], sound: [j] }
    }
  }
}
