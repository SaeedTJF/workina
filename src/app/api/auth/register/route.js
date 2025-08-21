import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { signSessionToken, ensureAdminUser } from '@/lib/auth'

export async function POST(request) {
  try {
    await ensureAdminUser()
    const { email, password, name, username } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ message: 'ایمیل و رمز عبور الزامی است' }, { status: 400 })
    }
    const isValidEmail = typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    if (!isValidEmail) {
      return NextResponse.json({ message: 'ایمیل نامعتبر است' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ message: 'کاربر از قبل وجود دارد' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { email, username: username || null, name: name || null, passwordHash } })

    const token = signSessionToken({ userId: user.id })
    const res = NextResponse.json({ id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin, mayEditTimes: user.mayEditTimes })
    res.cookies.set('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e) {
    return NextResponse.json({ message: 'خطای سرور' }, { status: 500 })
  }
}


