import { check as ratelimit } from './_ratelimit.mjs'

const logs = {}
const max = 200
let seq = 0

function origin(req, res) {
  const o = req.headers.origin
  if (!o || o === 'https://luaumcp.vercel.app' || o === 'http://localhost:3000') {
    res.setHeader('access-control-allow-origin', o || '*')
  } else {
    res.setHeader('access-control-allow-origin', 'https://luaumcp.vercel.app')
  }
  res.setHeader('access-control-allow-methods', 'get, post, options')
  res.setHeader('access-control-allow-headers', 'content-type')
}

export default async function handler(req, res) {
  origin(req, res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
  if (!ratelimit(ip)) return res.status(429).json({ error: 'too many requests' })

  const key = req.method === 'GET' ? req.query.key : (typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}).key
  if (!key || !/^[a-zA-Z0-9]{3}-[a-zA-Z0-9]{2}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{2}-[a-zA-Z0-9]{3}$/.test(key)) {
    return res.status(401).json({ error: 'invalid key' })
  }

  if (!logs[key]) logs[key] = { entries: [], lastseq: 0 }

  if (req.method === 'GET') {
    return res.json({ logs: logs[key].entries, seq: logs[key].lastseq })
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (body && body.text !== undefined) {
      seq++
      logs[key].entries.push({ text: body.text, type: body.type || 'output', time: Date.now(), s: seq })
      logs[key].lastseq = seq
      if (logs[key].entries.length > max * 2) logs[key].entries = logs[key].entries.slice(-max)
      return res.json({ status: 'ok' })
    }
    return res.status(400).json({ error: 'text required' })
  }

  return res.status(405).end()
}
