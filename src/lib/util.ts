export function currentURL() {
  return new URL(location.href)
}

export function updateURL(k: string, v: string | number) {
  const url = currentURL()
  url.searchParams.set(k, v.toString())
  window.history.replaceState(null, "", url)
}

export function swap<T>(a: T[], i: number, j: number) {
  ;[a[i], a[j]] = [a[j], a[i]]
}
