import { bubble } from "./bubble"
import { insertion } from "./insertion"
import { mergeSort } from "./merge"
import { pass } from "./pass"

export const sorters = {
  bubble,
  insertion,
  merge: mergeSort,
  pass,
}
