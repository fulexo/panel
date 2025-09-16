import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CsrfService {
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  verifyToken(token: string, sessionToken: string): boolean {
    if (!token || !sessionToken) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(token, 'hex'),
        Buffer.from(sessionToken, 'hex')
      );
    } catch {
      return false;
    }
  }
}