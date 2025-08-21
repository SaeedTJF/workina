import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ensureMidnightStops } from '@/lib/work'

export async function POST(request) {
  // Start work
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  await ensureMidnightStops(user.id)
  const open = await prisma.workPeriod.findFirst({ where: { userId: user.id, stoppedAt: null } })
  if (open) return NextResponse.json({ message: 'در حال حاضر استارت فعال است' }, { status: 400 })
  let projectId = null
  if (request) {
    try {
      const body = await request.json()
      if (body?.projectId) projectId = Number(body.projectId)
    } catch {}
  }
  const wp = await prisma.workPeriod.create({ data: { userId: user.id, startedAt: new Date(), projectId: projectId || null } })
  return NextResponse.json({ id: wp.id, startedAt: wp.startedAt })
}

export async function PATCH() {
  // Stop work
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  await ensureMidnightStops(user.id)
  const open = await prisma.workPeriod.findFirst({ where: { userId: user.id, stoppedAt: null }, orderBy: { createdAt: 'desc' } })
  if (!open) return NextResponse.json({ message: 'استارتی فعال نیست' }, { status: 400 })
  const wp = await prisma.workPeriod.update({ where: { id: open.id }, data: { stoppedAt: new Date() } })
  return NextResponse.json({ id: wp.id, startedAt: wp.startedAt, stoppedAt: wp.stoppedAt })
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  await ensureMidnightStops(user.id)
  const periods = await prisma.workPeriod.findMany({ where: { userId: user.id }, include: { project: true }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ periods })
}

export async function PUT(request) {
  // Edit times (user may edit own, admin can edit any)
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { id, startedAt, stoppedAt, userId } = await request.json()
  const period = await prisma.workPeriod.findUnique({ where: { id } })
  if (!period) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  if (!user.isAdmin) {
    if (!user.mayEditTimes) return NextResponse.json({ message: 'عدم دسترسی برای ویرایش' }, { status: 403 })
    if (period.userId !== user.id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const updated = await prisma.workPeriod.update({
    where: { id },
    data: {
      startedAt: startedAt ? new Date(startedAt) : period.startedAt,
      stoppedAt: stoppedAt === null ? null : stoppedAt ? new Date(stoppedAt) : period.stoppedAt,
      userId: user.isAdmin && userId ? userId : period.userId,
    },
  })
  return NextResponse.json({ period: updated })
}


