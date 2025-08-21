import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ projects })
}

export async function POST(request) {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { name, color } = await request.json()
  if (!name) return NextResponse.json({ message: 'نام پروژه الزامی است' }, { status: 400 })
  try {
    const norm = normalizeColor(color)
    const project = await prisma.project.create({ data: { name, color: norm } })
    return NextResponse.json({ project })
  } catch (e) {
    return NextResponse.json({ message: e?.message || 'امکان ایجاد پروژه وجود ندارد' }, { status: 400 })
  }
}

export async function PATCH(request) {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { id, name, color } = await request.json()
  const pid = Number(id)
  if (!pid) return NextResponse.json({ message: 'شناسه نامعتبر است' }, { status: 400 })
  try {
    const data = {}
    if (typeof name !== 'undefined') data.name = name
    if (typeof color !== 'undefined') data.color = normalizeColor(color)
    const project = await prisma.project.update({ where: { id: pid }, data })
    return NextResponse.json({ project })
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
  if (!id) return NextResponse.json({ message: 'شناسه الزامی است' }, { status: 400 })
  try {
    await prisma.task.updateMany({ where: { projectId: id }, data: { projectId: null } })
    await prisma.userProject.deleteMany({ where: { projectId: id } })
    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ message: 'خطا در حذف' }, { status: 400 })
  }
}


