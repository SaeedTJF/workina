import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(request) {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { userId, mayEditTimes } = await request.json()
  const updated = await prisma.user.update({ where: { id: userId }, data: { mayEditTimes: !!mayEditTimes } })
  return NextResponse.json({ user: { id: updated.id, mayEditTimes: updated.mayEditTimes } })
}


