import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ensureMidnightStops } from '@/lib/work'
import { withMongo, oid } from '@/lib/mongo'

export async function POST(request) {
  // Start work
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  await ensureMidnightStops(user.id)
  const open = await withMongo(db => db.collection('workPeriods').findOne({ userId: oid(user.id), stoppedAt: null }))
  if (open) return NextResponse.json({ message: 'در حال حاضر استارت فعال است' }, { status: 400 })
  let projectId = null
  if (request) {
    try {
      const body = await request.json()
      if (body?.projectId) projectId = String(body.projectId)
    } catch {}
  }
  const inserted = await withMongo(async db => {
    const doc = { userId: oid(user.id), startedAt: new Date(), stoppedAt: null, createdAt: new Date(), projectId: projectId ? oid(projectId) : null }
    const r = await db.collection('workPeriods').insertOne(doc)
    return { _id: r.insertedId, startedAt: doc.startedAt }
  })
  return NextResponse.json({ id: String(inserted._id), startedAt: inserted.startedAt })
}

export async function PATCH() {
  // Stop work
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  await ensureMidnightStops(user.id)
  const open = await withMongo(db => db.collection('workPeriods').find({ userId: oid(user.id), stoppedAt: null }).sort({ createdAt: -1 }).limit(1).next())
  if (!open) return NextResponse.json({ message: 'استارتی فعال نیست' }, { status: 400 })
  const stoppedAt = new Date()
  await withMongo(db => db.collection('workPeriods').updateOne({ _id: open._id }, { $set: { stoppedAt } }))
  return NextResponse.json({ id: String(open._id), startedAt: open.startedAt, stoppedAt })
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const periods = await withMongo(async db => {
    const list = await db.collection('workPeriods').find({ userId: oid(user.id) }).sort({ createdAt: -1 }).toArray()
    const projectIds = Array.from(new Set(list.map(p => p.projectId).filter(Boolean)))
    const projects = projectIds.length ? await db.collection('projects').find({ _id: { $in: projectIds } }).toArray() : []
    const pidToProject = new Map(projects.map(p => [String(p._id), { id: String(p._id), name: p.name, color: p.color || null }]))
    return list.map(p => ({
      id: String(p._id),
      startedAt: p.startedAt,
      stoppedAt: p.stoppedAt || null,
      project: p.projectId ? pidToProject.get(String(p.projectId)) || null : null,
    }))
  })
  return NextResponse.json({ periods })
}

export async function PUT(request) {
  // Edit times (user may edit own, admin can edit any)
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { id, startedAt, stoppedAt, userId } = await request.json()
  const period = await withMongo(db => db.collection('workPeriods').findOne({ _id: oid(id) }))
  if (!period) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  if (!user.isAdmin) {
    if (!user.mayEditTimes) return NextResponse.json({ message: 'عدم دسترسی برای ویرایش' }, { status: 403 })
    if (String(period.userId) !== String(oid(user.id))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const update = {
    startedAt: startedAt ? new Date(startedAt) : period.startedAt,
    stoppedAt: stoppedAt === null ? null : stoppedAt ? new Date(stoppedAt) : period.stoppedAt,
    userId: user.isAdmin && userId ? oid(userId) : period.userId,
  }
  await withMongo(db => db.collection('workPeriods').updateOne({ _id: oid(id) }, { $set: update }))
  const updated = { id, ...update }
  return NextResponse.json({ period: updated })
}


