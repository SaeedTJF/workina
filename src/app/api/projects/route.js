import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const me = await getCurrentUser()
  if (!me) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const projects = await prisma.project.findMany({
    where: { userProjects: { some: { userId: me.id } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ projects })
}


