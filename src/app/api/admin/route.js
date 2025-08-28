import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { withMongo } from '@/lib/mongo'

export async function GET() {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const users = await withMongo(async db => {
    const list = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray()
    const uids = list.map(u => u._id)
    const [wps, tasks, ups, projects] = await Promise.all([
      db.collection('workPeriods').find({ userId: { $in: uids } }).sort({ startedAt: -1 }).toArray(),
      db.collection('tasks').find({ userId: { $in: uids } }).sort({ occurredAt: -1 }).toArray(),
      db.collection('userProjects').find({ userId: { $in: uids } }).toArray(),
      db.collection('projects').find({}).toArray(),
    ])
    const pidToProject = new Map(projects.map(p => [String(p._id), { id: String(p._id), name: p.name, color: p.color || null }]))
    const uidToWps = new Map(uids.map(id => [String(id), []]))
    const uidToTasks = new Map(uids.map(id => [String(id), []]))
    const uidToUps = new Map(uids.map(id => [String(id), []]))
    for (const w of wps) uidToWps.get(String(w.userId))?.push({ id: String(w._id), startedAt: w.startedAt, stoppedAt: w.stoppedAt || null })
    for (const t of tasks) uidToTasks.get(String(t.userId))?.push({ id: String(t._id), title: t.title, description: t.description || null, occurredAt: t.occurredAt, project: t.projectId ? pidToProject.get(String(t.projectId)) || null : null })
    for (const u of ups) uidToUps.get(String(u.userId))?.push({ userId: String(u.userId), projectId: String(u.projectId), project: pidToProject.get(String(u.projectId)) || null })
    return list.map(u => ({
      id: String(u._id), email: u.email, username: u.username, name: u.name, isAdmin: !!u.isAdmin, mayEditTimes: !!u.mayEditTimes,
      workPeriods: uidToWps.get(String(u._id)) || [],
      tasks: uidToTasks.get(String(u._id)) || [],
      userProjects: uidToUps.get(String(u._id)) || [],
    }))
  })

  return NextResponse.json({ users })
}


