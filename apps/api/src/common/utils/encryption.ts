import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { Logger } from '@nestjs/common'

const ALGORITHM = 'aes-256-gcm'
const ENC_PREFIX = 'enc:'
const logger = new Logger('encryption')

function getKey(): Buffer | null {
  const hex = process.env['ENCRYPTION_KEY'] ?? ''
  if (hex.length === 0) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('ENCRYPTION_KEY is required in production')
    }
    logger.warn('ENCRYPTION_KEY not set — tokens will be stored unencrypted (dev only)')
    return null
  }
  if (hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  if (!key) return plaintext

  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ENC_PREFIX + [iv, tag, encrypted].map((b) => b.toString('base64')).join(':')
}

export function decrypt(value: string): string {
  if (!value.startsWith(ENC_PREFIX)) {
    // Unencrypted legacy value — return as-is (handles migration from pre-encryption deployments)
    return value
  }
  const key = getKey()
  if (!key) return value

  const parts = value.slice(ENC_PREFIX.length).split(':')
  if (parts.length !== 3) throw new Error('Malformed encrypted token')
  const [ivB64, tagB64, dataB64] = parts as [string, string, string]
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
