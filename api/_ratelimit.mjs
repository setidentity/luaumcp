const hits = new Map()

export function check(ip) {
  if (!ip) return true
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry) {
    hits.set(ip, { count: 1, start: now })
    return true
  }
  if (now - entry.start > 60000) {
    hits.set(ip, { count: 1, start: now })
    return true
  }
  entry.count++
  return entry.count <= 300
}

setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of hits) {
    if (now - entry.start > 120000) hits.delete(ip)
  }
}, 60000)
