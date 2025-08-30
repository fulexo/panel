import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc'
  private readonly key: string

  constructor() {
    this.key = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!'
  }

  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipher(this.algorithm, this.key)
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      return iv.toString('hex') + ':' + encrypted
    } catch (error) {
      throw new Error('Encryption failed')
    }
  }

  decrypt(encryptedText: string): string {
    try {
      const textParts = encryptedText.split(':')
      const encrypted = textParts[1]
      const decipher = crypto.createDecipher(this.algorithm, this.key)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error) {
      throw new Error('Decryption failed')
    }
  }
}
