import { LuaFactory } from 'wasmoon'

const factory = new LuaFactory()

export default async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-methods', 'post, options')
  res.setHeader('access-control-allow-headers', 'content-type')

  const m = req.method
  if (m === 'OPTIONS') return res.status(200).end()
  if (m !== 'POST') return res.status(405).json({ error: 'only post allowed' })

  const code = req.body?.code
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'code field required as string' })

  let lua
  try {
    lua = await factory.createEngine()
  } catch (e) {
    return res.status(500).json({ error: 'engine init failed: ' + e.message })
  }

  try {
    const lines = []
    lua.global.set('print', (...args) => lines.push(args.map(String).join('\t')))
    const result = await lua.doString(code)
    if (result !== undefined) lines.push(String(result))
    return res.json({ output: lines.join('\n'), success: true })
  } catch (e) {
    return res.json({ output: e.message, success: false })
  } finally {
    lua.global.close()
  }
}
