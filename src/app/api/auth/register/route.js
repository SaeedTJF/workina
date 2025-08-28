import { withMongo } from '@/lib/mongo'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { signSessionToken } from '@/lib/auth'

export async function POST(request) {
  try {
    const { email, password, name, username } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ message: 'ایمیل و رمز عبور الزامی است' }, { status: 400 })
    }
    const isValidEmail = typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    if (!isValidEmail) {
      return NextResponse.json({ message: 'ایمیل نامعتبر است' }, { status: 400 })
    }

    const existing = await withMongo(db => db.collection('users').findOne({ email }))
    if (existing) {
      return NextResponse.json({ message: 'کاربر از قبل وجود دارد' }, { status: 409 })
    }

    const totalUsers = await withMongo(db => db.collection('users').countDocuments({}))
    const passwordHash = await bcrypt.hash(password, 10)
    const doc = {
      email,
      username: username || null,
      name: name || null,
      passwordHash,
      isAdmin: totalUsers === 0, // first user becomes admin
      mayEditTimes: false,
      createdAt: new Date(),
    }
    const inserted = await withMongo(async db => {
      const r = await db.collection('users').insertOne(doc)
      return await db.collection('users').findOne({ _id: r.insertedId })
    })

    const token = signSessionToken({ userId: String(inserted._id) })
    const res = NextResponse.json({ id: String(inserted._id), email: inserted.email, name: inserted.name, isAdmin: !!inserted.isAdmin, mayEditTimes: !!inserted.mayEditTimes })
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


