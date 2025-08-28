import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { withMongo, oid } from '@/lib/mongo'

export async function PATCH(request) {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { userId, projectId, assigned } = await request.json()
  if (!userId || !projectId) return NextResponse.json({ message: 'Bad request' }, { status: 400 })
  if (assigned) {
    await withMongo(db => db.collection('userProjects').updateOne({ userId: oid(userId), projectId: oid(projectId) }, { $setOnInsert: { userId: oid(userId), projectId: oid(projectId), createdAt: new Date() } }, { upsert: true }))
  } else {
    await withMongo(db => db.collection('userProjects').deleteMany({ userId: oid(userId), projectId: oid(projectId) }))
  }
  return NextResponse.json({ ok: true })
}


