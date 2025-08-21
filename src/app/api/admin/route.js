import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser, ensureAdminUser } from '@/lib/auth'

export async function GET() {
  await ensureAdminUser()
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  const users = await prisma.user.findMany({
    include: {
      workPeriods: { orderBy: { startedAt: 'desc' } },
      tasks: { orderBy: { occurredAt: 'desc' } },
      userProjects: { include: { project: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ users })
}


