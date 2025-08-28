import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { withMongo, oid } from '@/lib/mongo'

export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const projects = await withMongo(async db => {
    const ups = await db.collection('userProjects').find({ userId: oid(me.id) }).toArray()
    const pids = ups.map(u => u.projectId)
    const list = pids.length ? await db.collection('projects').find({ _id: { $in: pids } }).sort({ createdAt: -1 }).toArray() : []
    return list.map(p => ({ id: String(p._id), name: p.name, color: p.color || null }))
  })
  return NextResponse.json({ projects })
}


