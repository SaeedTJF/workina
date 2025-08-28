import { NextResponse } from 'next/server'
import { getDbConfig, saveDbConfig, buildMongoParams } from '@/lib/config'
import { MongoClient } from 'mongodb'

export async function GET() {
  const cfg = getDbConfig()
  return NextResponse.json({ configured: !!cfg })
}

export async function POST(request) {
  try {
    const body = await request.json()
    // Accept either { uri, dbName } or { host, port, useAuth, username, password, dbName }
    const params = buildMongoParams(body?.uri ? { uri: body.uri, dbName: body.dbName } : body)
    if (!params?.dbName || !params?.uri) return NextResponse.json({ message: 'پارامترهای اتصال نامعتبر است' }, { status: 400 })
    saveDbConfig(body)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ message: 'خطا در ذخیره تنظیمات' }, { status: 500 })
  }
}

export async function PUT(request) {
  // Test connection without saving
  try {
    const body = await request.json()
    const params = buildMongoParams(body?.uri ? { uri: body.uri, dbName: body.dbName } : body)
    if (!params?.dbName || !params?.uri) return NextResponse.json({ ok: false, message: 'پارامترهای اتصال نامعتبر است' }, { status: 400 })
    const client = new MongoClient(params.uri, { serverSelectionTimeoutMS: 3000 })
    try {
      await client.connect()
      await client.db(params.dbName).command({ ping: 1 })
      return NextResponse.json({ ok: true })
    } finally {
      await client.close().catch(() => {})
    }
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'اتصال ناموفق بود' }, { status: 500 })
  }
}


