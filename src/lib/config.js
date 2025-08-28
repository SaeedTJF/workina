import fs from 'fs'
import path from 'path'

const CONFIG_DIR = path.join(process.cwd(), 'config')
const CONFIG_PATH = path.join(CONFIG_DIR, 'db.json')

export function getDbConfig() {
  const envUri = process.env.MONGO_URI || process.env.MONGODB_URI
  const envDb = process.env.MONGO_DB || process.env.MONGODB_DB || process.env.MONGO_DATABASE
  if (envUri && envDb) return { mode: 'uri', uri: envUri, dbName: envDb }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const json = JSON.parse(raw)
    // Accept legacy { uri, dbName }
    if (json?.uri && json?.dbName) return { mode: 'uri', uri: json.uri, dbName: json.dbName }
    // New format { mode:'parts', host, port, useAuth, username, password, dbName }
    if (json?.host && json?.port && json?.dbName) {
      return {
        mode: 'parts',
        host: json.host,
        port: Number(json.port),
        useAuth: !!json.useAuth,
        username: json.username || '',
        password: json.password || '',
        dbName: json.dbName,
      }
    }
    return null
  } catch {
    return null
  }
}

export function buildMongoParams(conf) {
  if (!conf) return null
  if (conf.mode === 'uri' && conf.uri && conf.dbName) return { uri: conf.uri, dbName: conf.dbName }
  if (conf.host && conf.port && conf.dbName) {
    const auth = conf.useAuth && conf.username ? `${encodeURIComponent(conf.username)}:${encodeURIComponent(conf.password || '')}@` : ''
    const uri = `mongodb://${auth}${conf.host}:${conf.port}`
    return { uri, dbName: conf.dbName }
  }
  return null
}

export function saveDbConfig(conf) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
  // Allow both legacy { uri, dbName } and new parts
  if (conf?.uri && conf?.dbName) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ mode: 'uri', uri: conf.uri, dbName: conf.dbName }, null, 2), 'utf-8')
    return
  }
  if (!conf?.host || !conf?.port || !conf?.dbName) throw new Error('host, port, and dbName are required')
  const json = {
    mode: 'parts',
    host: conf.host,
    port: Number(conf.port),
    useAuth: !!conf.useAuth,
    username: conf.username || '',
    password: conf.password || '',
    dbName: conf.dbName,
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(json, null, 2), 'utf-8')
}


