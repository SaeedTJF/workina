import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { withMongo, oid } from '@/lib/mongo'

export async function PATCH(request) {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { userId, mayEditTimes } = await request.json()
  await withMongo(db => db.collection('users').updateOne({ _id: oid(userId) }, { $set: { mayEditTimes: !!mayEditTimes } }))
  return NextResponse.json({ user: { id: String(userId), mayEditTimes: !!mayEditTimes } })
}


