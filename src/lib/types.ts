export interface Bar {
  value: number
  freq: number
}

export type SortGenerator = Generator<{
  read: number[]
  write?: number[]
  sound: number[]
}>
