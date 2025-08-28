import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { withMongo, oid } from './mongo'
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
    const user = await withMongo(db => db.collection('users').findOne({ _id: oid(decoded.userId) }))
    if (!user) return null
    return {
      id: String(user._id),
      email: user.email,
      username: user.username,
      name: user.name,
      isAdmin: !!user.isAdmin,
      mayEditTimes: !!user.mayEditTimes,
    }
  } catch {
    return null
  }
}

export async function ensureAdminUser() {
  // In Mongo mode we do not auto-create admin silently.
  // Keep function for backward compatibility; return null if exists, otherwise null.
  const existing = await withMongo(db => db.collection('users').findOne({ $or: [{ username: 'admin' }, { email: 'admin@local' }] }))
  return existing ? {
    id: String(existing._id),
    email: existing.email,
    username: existing.username,
    name: existing.name,
    isAdmin: !!existing.isAdmin,
    mayEditTimes: !!existing.mayEditTimes,
  } : null
}


