import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { withMongo } from '@/lib/mongo'

export async function POST() {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    await withMongo(async db => {
      // users: unique email, unique username (sparse)
      await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true })
      await db.collection('users').createIndex({ username: 1 }, { unique: true, sparse: true })
      // projects: unique name
      await db.collection('projects').createIndex({ name: 1 }, { unique: true })
      // userProjects: unique pair
      await db.collection('userProjects').createIndex({ userId: 1, projectId: 1 }, { unique: true })
      // workPeriods: useful queries
      await db.collection('workPeriods').createIndex({ userId: 1, createdAt: -1 })
      await db.collection('workPeriods').createIndex({ userId: 1, startedAt: -1 })
      // tasks: useful queries
      await db.collection('tasks').createIndex({ userId: 1, occurredAt: -1 })
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ message: 'خطا در ایجاد ساختار دیتابیس' }, { status: 500 })
  }
}


