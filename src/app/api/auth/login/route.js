import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { signSessionToken, setAuthCookie, clearAuthCookie, ensureAdminUser } from '@/lib/auth'

export async function POST(request) {
  try {
    await ensureAdminUser()
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ message: 'ایمیل و رمز عبور الزامی است' }, { status: 400 })
    }
    const user = email.includes('@')
      ? await prisma.user.findUnique({ where: { email } })
      : await prisma.user.findUnique({ where: { username: email } })
    if (!user) {
      return NextResponse.json({ message: 'کاربر یافت نشد' }, { status: 404 })
    }
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ message: 'رمز عبور نادرست است' }, { status: 401 })
    }
    const token = signSessionToken({ userId: user.id })
    await setAuthCookie(token)
    return NextResponse.json({ id: user.id, email: user.email, name: user.name })
  } catch (e) {
    return NextResponse.json({ message: 'خطای سرور' }, { status: 500 })
  }
}

export async function DELETE() {
  await clearAuthCookie()
  return NextResponse.json({ ok: true })
}


