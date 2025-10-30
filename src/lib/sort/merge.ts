import type { Bar, SortGenerator } from "../types"

export function* mergeSort(bars: Bar[], l = 0, r = bars.length - 1): SortGenerator {
  if (l >= r) return
  const mid = Math.floor((l + r) / 2)
  yield* mergeSort(bars, l, mid)
  yield* mergeSort(bars, mid + 1, r)
  yield* merge(bars, l, mid, r)
}

function* merge(bars: Bar[], l: number, mid: number, r: number) {
  const left = bars.slice(l, mid + 1)
  const right = bars.slice(mid + 1, r + 1)
  let i = 0,
    j = 0,
    k = l

  while (i < left.length && j < right.length) {
    const read = [l + i, mid + 1 + j]
    yield { read, write: [k], sound: read }
    if (left[i].value <= right[j].value) {
      bars[k++] = left[i++]
    } else {
      bars[k++] = right[j++]
    }
  }

  while (i < left.length) {
    bars[k++] = left[i++]
    yield { read: [k - 1], write: [k], sound: [k - 1] }
  }

  while (j < right.length) {
    bars[k++] = right[j++]
    yield { read: [k - 1], write: [k], sound: [k - 1] }
  }
}
