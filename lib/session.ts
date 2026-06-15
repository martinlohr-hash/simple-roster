import { SignJWT, jwtVerify } from 'jose'

export type SessionPayload = {
  userId: string
  role: 'ADMIN' | 'EMPLOYEE'
  name: string
}

const secretKey = process.env.SESSION_SECRET || 'fallback-dev-secret-32-characters!!'
const encodedKey = new TextEncoder().encode(secretKey)

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

export async function decrypt(session: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
