import { prisma } from './db'

function endOfLocalDay(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export async function ensureMidnightStops(userId) {
  // Close any open periods that belong to previous days at 23:59:59.999 of their start date
  const open = await prisma.workPeriod.findMany({ where: { userId, stoppedAt: null } })
  const now = new Date()
  const updates = []
  for (const p of open) {
    const sameDay = p.startedAt.getFullYear() === now.getFullYear() &&
      p.startedAt.getMonth() === now.getMonth() &&
      p.startedAt.getDate() === now.getDate()
    if (!sameDay) {
      updates.push(prisma.workPeriod.update({ where: { id: p.id }, data: { stoppedAt: endOfLocalDay(p.startedAt) } }))
    }
  }
  if (updates.length) await prisma.$transaction(updates)
}


