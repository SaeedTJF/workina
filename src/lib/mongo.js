import { MongoClient, ObjectId } from 'mongodb'
import { getDbConfig, buildMongoParams } from './config'

let cached = globalThis.__mongoClient

export function getMongoClient() {
  if (cached?.client && cached?.db) return cached
  const conf = buildMongoParams(getDbConfig())
  if (!conf) throw new Error('Database is not configured. Please configure Mongo connection.')
  const client = new MongoClient(conf.uri, { maxPoolSize: 10 })
  const db = client.db(conf.dbName)
  cached = { client, db }
  globalThis.__mongoClient = cached
  return cached
}

export async function withMongo(callback) {
  const { client, db } = getMongoClient()
  try {
    if (!client.topology?.isConnected?.()) await client.connect()
    return await callback(db)
  } finally {
    // keep client connected for reuse in serverless/edge runtime; do not close
  }
}

export function oid(id) {
  if (!id) return null
  try { return new ObjectId(String(id)) } catch { return null }
}



