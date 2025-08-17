import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from './db'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const COOKIE_NAME = 'token'

export function signSessionToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export async function setAuthCookie(token) {
  const c = await cookies()
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearAuthCookie() {
  const c = await cookies()
  c.set(COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' })
}

export async function getCurrentUser() {
  const c = await cookies()
  const token = c.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    return user
  } catch {
    return null
  }
}

export async function ensureAdminUser() {
  const existing = await prisma.user.findFirst({ where: { OR: [{ username: 'admin' }, { email: 'admin@local' }] } })
  if (existing) return existing
  const passwordHash = await bcrypt.hash('6006296', 10)
  return prisma.user.create({ data: { username: 'admin', email: 'admin@local', name: 'ادمین', passwordHash, isAdmin: true } })
}


