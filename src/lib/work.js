import { withMongo, oid } from './mongo'

function endOfLocalDay(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export async function ensureMidnightStops(userId) {
  // Close any open periods that belong to previous days at 23:59:59.999 of their start date
  const uid = oid(userId)
  if (!uid) return
  const now = new Date()
  await withMongo(async db => {
    const open = await db.collection('workPeriods').find({ userId: uid, stoppedAt: null }).toArray()
    const bulk = db.collection('workPeriods').initializeUnorderedBulkOp()
    let count = 0
    for (const p of open) {
      const startedAt = new Date(p.startedAt)
      const sameDay = startedAt.getFullYear() === now.getFullYear() &&
        startedAt.getMonth() === now.getMonth() &&
        startedAt.getDate() === now.getDate()
      if (!sameDay) {
        bulk.find({ _id: p._id }).updateOne({ $set: { stoppedAt: endOfLocalDay(startedAt) } })
        count++
      }
    }
    if (count > 0) await bulk.execute()
  })
}


