import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { withMongo, oid } from '@/lib/mongo'

export async function GET(request) {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const uid = oid(id)
  if (!uid) return NextResponse.json({ message: 'Bad request' }, { status: 400 })
  const user = await withMongo(async db => {
    const u = await db.collection('users').findOne({ _id: uid })
    if (!u) return null
    const [wps, tasks] = await Promise.all([
      db.collection('workPeriods').find({ userId: uid }).sort({ startedAt: -1 }).toArray(),
      db.collection('tasks').find({ userId: uid }).sort({ occurredAt: -1 }).toArray(),
    ])
    return {
      id: String(u._id), email: u.email, username: u.username, name: u.name, isAdmin: !!u.isAdmin, mayEditTimes: !!u.mayEditTimes,
      workPeriods: wps.map(w => ({ id: String(w._id), startedAt: w.startedAt, stoppedAt: w.stoppedAt || null })),
      tasks: tasks.map(t => ({ id: String(t._id), title: t.title, description: t.description || null, occurredAt: t.occurredAt })),
    }
  })
  if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  return NextResponse.json({ user })
}


