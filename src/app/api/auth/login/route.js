import { withMongo } from '@/lib/mongo'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { signSessionToken } from '@/lib/auth'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ message: 'ایمیل و رمز عبور الزامی است' }, { status: 400 })
    }
    const user = await withMongo(db => db.collection('users').findOne(email.includes('@') ? { email } : { username: email }))
    if (!user) {
      return NextResponse.json({ message: 'کاربر یافت نشد' }, { status: 404 })
    }
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ message: 'رمز عبور نادرست است' }, { status: 401 })
    }
    const token = signSessionToken({ userId: String(user._id) })
    const res = NextResponse.json({ id: String(user._id), email: user.email, name: user.name, isAdmin: !!user.isAdmin, mayEditTimes: !!user.mayEditTimes })
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

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('token', '', { httpOnly: true, maxAge: 0, path: '/' })
  return res
}


