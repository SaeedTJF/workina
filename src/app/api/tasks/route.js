import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { withMongo, oid } from '@/lib/mongo'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const tasks = await withMongo(async db => {
    const list = await db.collection('tasks').find({ userId: oid(user.id) }).sort({ occurredAt: -1 }).toArray()
    const pids = Array.from(new Set(list.map(t => t.projectId).filter(Boolean)))
    const projects = pids.length ? await db.collection('projects').find({ _id: { $in: pids } }).toArray() : []
    const pidToProject = new Map(projects.map(p => [String(p._id), { id: String(p._id), name: p.name, color: p.color || null }]))
    return list.map(t => ({ id: String(t._id), title: t.title, description: t.description || null, occurredAt: t.occurredAt, project: t.projectId ? pidToProject.get(String(t.projectId)) || null : null }))
  })
  return NextResponse.json({ tasks })
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { title, description, occurredAt, projectId } = await request.json()
  if (!title) return NextResponse.json({ message: 'عنوان الزامی است' }, { status: 400 })
  let pid = null
  if (projectId) {
    const project = await withMongo(db => db.collection('projects').findOne({ _id: oid(projectId) }))
    if (!project) return NextResponse.json({ message: 'پروژه یافت نشد' }, { status: 404 })
    if (!user.isAdmin) {
      const assigned = await withMongo(db => db.collection('userProjects').findOne({ userId: oid(user.id), projectId: oid(projectId) }))
      if (!assigned) return NextResponse.json({ message: 'دسترسی به پروژه ندارید' }, { status: 403 })
    }
    pid = oid(projectId)
  }
  const created = await withMongo(async db => {
    const doc = { userId: oid(user.id), title, description: description || null, occurredAt: occurredAt ? new Date(occurredAt) : new Date(), createdAt: new Date(), projectId: pid }
    const r = await db.collection('tasks').insertOne(doc)
    return { _id: r.insertedId, ...doc }
  })
  const task = { id: String(created._id), title: created.title, description: created.description, occurredAt: created.occurredAt, project: null }
  return NextResponse.json({ task })
}

export async function PATCH(request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { id, title, description, occurredAt } = await request.json()
  const task = await withMongo(db => db.collection('tasks').findOne({ _id: oid(id) }))
  if (!task) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  if (!user.isAdmin && String(task.userId) !== String(oid(user.id))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  const update = {
    title: title ?? task.title,
    description: description === undefined ? task.description : description,
    occurredAt: occurredAt ? new Date(occurredAt) : task.occurredAt,
  }
  await withMongo(db => db.collection('tasks').updateOne({ _id: oid(id) }, { $set: update }))
  return NextResponse.json({ task: { id, ...update } })
}


