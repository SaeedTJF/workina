import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { signSessionToken, setAuthCookie, ensureAdminUser } from '@/lib/auth'

export async function POST(request) {
  try {
    await ensureAdminUser()
    const { email, password, name, username } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ message: 'ایمیل و رمز عبور الزامی است' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ message: 'کاربر از قبل وجود دارد' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { email, username: username || null, name: name || null, passwordHash } })

    const token = signSessionToken({ userId: user.id })
    await setAuthCookie(token)
    return NextResponse.json({ id: user.id, email: user.email, name: user.name })
  } catch (e) {
    return NextResponse.json({ message: 'خطای سرور' }, { status: 500 })
  }
}


