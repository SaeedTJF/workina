import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request) {
  const me = await getCurrentUser()
  if (!me || !me.isAdmin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const id = Number(searchParams.get('id'))
  if (!id) return NextResponse.json({ message: 'Bad request' }, { status: 400 })
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      workPeriods: { orderBy: { startedAt: 'desc' } },
      tasks: { orderBy: { occurredAt: 'desc' } },
    }
  })
  if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  return NextResponse.json({ user })
}


