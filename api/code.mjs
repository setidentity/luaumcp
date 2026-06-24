import crypto from 'crypto'
import { check as ratelimit } from './_ratelimit.mjs'

const maxsize = 100000
const jobs = new Map()
let nextid = 1

function genkey() {
  const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const p = (n) => { let s = ''; for (let i = 0; i < n; i++) s += c[crypto.randomInt(c.length)]; return s }
  return p(3) + '-' + p(2) + '-' + p(4) + '-' + p(2) + '-' + p(3)
}

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
  try {
    origin(req, res)
    if (req.method === 'OPTIONS') return res.status(200).end()

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    if (!ratelimit(ip)) return res.status(429).json({ error: 'too many requests' })

    if (req.method === 'GET') {
      const qid = req.query?.id
      const key = req.query?.key
      if (!key) return res.json({ error: 'key required' })

      if (qid) {
        const job = jobs.get(Number(qid))
        if (!job) return res.json({ error: 'not found' })
        if (job.key !== key) return res.json({ error: 'key mismatch' })
        return res.json({ id: Number(qid), status: job.status, output: job.output, console: job.console, success: job.success })
      }

      for (const [id, job] of jobs) {
        if (job.status === 'pending' && job.key === key) {
          job.status = 'claimed'
          return res.json({ id, code: job.code })
        }
      }
      return res.json({ empty: true })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

      if (body && body.code && body.key) {
        if (body.code.length > maxsize) return res.status(413).json({ error: 'code too large' })
        const id = nextid++
        jobs.set(id, { code: body.code, key: body.key, status: 'pending', output: null, console: null, success: null })
        return res.json({ id, status: 'pending' })
      }

      if (body && body.id && body.output !== undefined) {
        const job = jobs.get(body.id)
        if (!job) return res.status(404).json({ error: 'not found' })
        job.status = 'done'
        job.output = body.output
        job.console = body.console || ''
        job.success = body.success !== false
        return res.json({ status: 'done' })
      }

      if (body && body.genkey) {
        return res.json({ key: genkey() })
      }

      return res.status(400).json({ error: 'invalid body' })
    }

    return res.status(405).json({ error: 'only get and post allowed' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
