import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private tagLength = 16;
  private saltLength = 64;
  private iterations = 10000;

  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, this.iterations, this.keyLength, 'sha256');
  }

  encrypt(text: string): string {
    const password = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this';
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    
    // Derive key from password and salt
    const key = this.deriveKey(password, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    
    // Get auth tag
    const tag = cipher.getAuthTag();
    
    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted]);
    
    // Return base64 encoded
    return combined.toString('base64');
  }

  decrypt(encryptedText: string): string {
    const password = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-this';
    
    // Decode from base64
    const combined = Buffer.from(encryptedText, 'base64');
    
    // Extract components
    const salt = combined.slice(0, this.saltLength);
    const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
    const tag = combined.slice(
      this.saltLength + this.ivLength,
      this.saltLength + this.ivLength + this.tagLength
    );
    const encrypted = combined.slice(this.saltLength + this.ivLength + this.tagLength);
    
    // Derive key from password and salt
    const key = this.deriveKey(password, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    return decrypted.toString('utf8');
  }
}