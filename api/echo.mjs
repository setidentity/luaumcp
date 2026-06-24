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
  res.json({ text: 'pong' })
}
