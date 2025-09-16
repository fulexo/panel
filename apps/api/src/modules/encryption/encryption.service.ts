import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly key: Buffer
  private readonly saltLength = 32
  private readonly tagLength = 16
  private readonly ivLength = 16

  constructor() {
    const keyString = process.env.ENCRYPTION_KEY
    
    if (!keyString) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY environment variable is required in production')
      }
      // ENCRYPTION_KEY not set, using default key (development only)
      this.key = crypto.scryptSync('default-dev-key', 'salt', 32)
    } else {
      if (keyString.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be exactly 32 characters long')
      }
      // Derive key from the provided string using scrypt
      const salt = crypto.createHash('sha256').update(keyString).digest()
      this.key = crypto.scryptSync(keyString, salt, 32)
    }
  }

  encrypt(text: string): string {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength)
      
      // Create cipher with the key and IV
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8')
      encrypted = Buffer.concat([encrypted, cipher.final()])
      
      // Get the authentication tag
      const tag = cipher.getAuthTag()
      
      // Combine IV, tag, and encrypted data
      const combined = Buffer.concat([iv, tag, encrypted])
      
      // Return base64 encoded string
      return combined.toString('base64')
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`)
    }
  }

  decrypt(encryptedText: string): string {
    try {
      // Decode from base64
      const combined = Buffer.from(encryptedText, 'base64')
      
      // Extract IV, tag, and encrypted data
      const iv = combined.slice(0, this.ivLength)
      const tag = combined.slice(this.ivLength, this.ivLength + this.tagLength)
      const encrypted = combined.slice(this.ivLength + this.tagLength)
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv)
      decipher.setAuthTag(tag)
      
      // Decrypt
      let decrypted = decipher.update(encrypted)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      
      return decrypted.toString('utf8')
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`)
    }
  }
  
  // Hash sensitive data for storage (one-way)
  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex')
  }
  
  // Timing-safe comparison
  compareHash(text: string, hash: string): boolean {
    const textHash = this.hash(text)
    return crypto.timingSafeEqual(Buffer.from(textHash), Buffer.from(hash))
  }
}
