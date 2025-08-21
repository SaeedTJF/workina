import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const tasks = await prisma.task.findMany({ where: { userId: user.id }, include: { project: true }, orderBy: { occurredAt: 'desc' } })
  return NextResponse.json({ tasks })
}

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { title, description, occurredAt, projectId } = await request.json()
  if (!title) return NextResponse.json({ message: 'عنوان الزامی است' }, { status: 400 })
  let pid = null
  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ message: 'پروژه یافت نشد' }, { status: 404 })
    if (!user.isAdmin) {
      const assigned = await prisma.userProject.findUnique({ where: { userId_projectId: { userId: user.id, projectId } } })
      if (!assigned) return NextResponse.json({ message: 'دسترسی به پروژه ندارید' }, { status: 403 })
    }
    pid = projectId
  }
  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title,
      description: description || null,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      projectId: pid,
    },
  })
  return NextResponse.json({ task })
}

export async function PATCH(request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { id, title, description, occurredAt } = await request.json()
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  if (!user.isAdmin && task.userId !== user.id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  const updated = await prisma.task.update({
    where: { id },
    data: {
      title: title ?? task.title,
      description: description === undefined ? task.description : description,
      occurredAt: occurredAt ? new Date(occurredAt) : task.occurredAt,
    },
  })
  return NextResponse.json({ task: updated })
}


