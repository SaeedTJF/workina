import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(request) {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { userId, projectId, assigned } = await request.json()
  if (!userId || !projectId) return NextResponse.json({ message: 'Bad request' }, { status: 400 })
  if (assigned) {
    await prisma.userProject.upsert({
      where: { userId_projectId: { userId, projectId } },
      update: {},
      create: { userId, projectId },
    })
  } else {
    await prisma.userProject.deleteMany({ where: { userId, projectId } })
  }
  return NextResponse.json({ ok: true })
}


