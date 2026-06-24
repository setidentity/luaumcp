import { check as ratelimit } from './_ratelimit.mjs'

function origin(req, res) {
  const o = req.headers.origin
  if (!o || o === 'https://luaumcp.vercel.app' || o === 'http://localhost:3000') {
    res.setHeader('access-control-allow-origin', o || '*')
  } else {
    res.setHeader('access-control-allow-origin', 'https://luaumcp.vercel.app')
  }
}

export default async function handler(req, res) {
  origin(req, res)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
  if (!ratelimit(ip)) return res.status(429).json({ error: 'too many requests' })

  const id = req.query.userid
  if (!id) return res.status(400).end()

  try {
    const r = await fetch('https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + id + '&size=48x48&format=Png')
    const d = await r.json()
    if (!d.data || !d.data[0]) return res.status(404).end()
    const img = await fetch(d.data[0].imageUrl)
    const buf = await img.arrayBuffer()
    res.setHeader('content-type', img.headers.get('content-type') || 'image/png')
    res.setHeader('cache-control', 'public, max-age=86400')
    res.end(Buffer.from(buf))
  } catch {
    res.status(500).end()
  }
}
