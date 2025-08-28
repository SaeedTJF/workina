import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { withMongo, oid } from '@/lib/mongo'

export async function GET() {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const projects = await withMongo(db => db.collection('projects').find({}).sort({ createdAt: -1 }).toArray())
  return NextResponse.json({ projects: projects.map(p => ({ id: String(p._id), name: p.name, color: p.color || null })) })
}

export async function POST(request) {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { name, color } = await request.json()
  if (!name) return NextResponse.json({ message: 'نام پروژه الزامی است' }, { status: 400 })
  try {
    const norm = normalizeColor(color)
    const created = await withMongo(async db => {
      const r = await db.collection('projects').insertOne({ name, color: norm, createdAt: new Date() })
      return await db.collection('projects').findOne({ _id: r.insertedId })
    })
    return NextResponse.json({ project: { id: String(created._id), name: created.name, color: created.color || null } })
  } catch (e) {
    return NextResponse.json({ message: e?.message || 'امکان ایجاد پروژه وجود ندارد' }, { status: 400 })
  }
}

export async function PATCH(request) {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { id, name, color } = await request.json()
  const pid = oid(id)
  if (!pid) return NextResponse.json({ message: 'شناسه نامعتبر است' }, { status: 400 })
  try {
    const data = {}
    if (typeof name !== 'undefined') data.name = name
    if (typeof color !== 'undefined') data.color = normalizeColor(color)
    await withMongo(db => db.collection('projects').updateOne({ _id: pid }, { $set: data }))
    const project = await withMongo(db => db.collection('projects').findOne({ _id: pid }))
    return NextResponse.json({ project: { id: String(project._id), name: project.name, color: project.color || null } })
  } catch (e) {
    return NextResponse.json({ message: e?.message || 'خطا در ویرایش' }, { status: 400 })
  }
}

function normalizeColor(c) {
  if (!c) return null
  let v = String(c).trim()
  if (!v) return null
  if (!v.startsWith('#')) v = `#${v}`
  // Accept 3 or 6 hex digits; otherwise fallback to null
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)
  return m ? v : null
}

export async function DELETE(request) {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  const pid = oid(id)
  if (!pid) return NextResponse.json({ message: 'شناسه الزامی است' }, { status: 400 })
  try {
    await withMongo(db => db.collection('tasks').updateMany({ projectId: pid }, { $set: { projectId: null } }))
    await withMongo(db => db.collection('userProjects').deleteMany({ projectId: pid }))
    await withMongo(db => db.collection('projects').deleteOne({ _id: pid }))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ message: 'خطا در حذف' }, { status: 400 })
  }
}


