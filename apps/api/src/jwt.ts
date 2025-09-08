import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import * as jose from "jose";
import { randomBytes } from "crypto";

export type JwtPair = { access: string; refresh: string };

@Injectable()
export class JwtService {
  private alg = "HS256";
  private privateKey?: any;
  private publicKey?: any;
  private publicJwks?: any;
  private hsSecret?: Uint8Array;

  async init() {
    if (this.alg === "RS256") {
      const { publicKey, privateKey } = await jose.generateKeyPair("RS256");
      this.privateKey = privateKey;
      this.publicKey = publicKey;
      this.publicJwks = await jose.exportJWK(publicKey);
    } else {
      // JWT_SECRET is required in production
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET environment variable is required in production');
        }
        // Only use random secret in development
        console.warn('⚠️ JWT_SECRET not set, using random secret (development only)');
        this.hsSecret = new TextEncoder().encode(randomBytes(32).toString("hex"));
      } else {
        if (secret.length < 64) {
          throw new Error('JWT_SECRET must be at least 64 characters long');
        }
        this.hsSecret = new TextEncoder().encode(secret);
      }
    }
    console.log("🔑 JWT Service initialized with", this.alg, "algorithm");
  }

  async issueTokens(userId: string, email: string, role: string, tenantId?: string): Promise<JwtPair> {
    const payload: any = { sub: userId, email, role };
    if (tenantId) payload.tenantId = tenantId;

    if (this.alg === "RS256") {
      const access = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "RS256" })
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(this.privateKey);

      const refresh = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "RS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(this.privateKey);

      return { access, refresh };
    } else {
      const access = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(this.hsSecret!);

      const refresh = await new jose.SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(this.hsSecret!);

      return { access, refresh };
    }
  }

  async verifyAccessToken(token: string): Promise<any> {
    try {
      if (this.alg === "RS256") {
        const { payload } = await jose.jwtVerify(token, this.publicKey);
        return payload;
      } else {
        const { payload } = await jose.jwtVerify(token, this.hsSecret!);
        return payload;
      }
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  async verifyRefreshToken(token: string): Promise<any> {
    try {
      if (this.alg === "RS256") {
        const { payload } = await jose.jwtVerify(token, this.publicKey);
        return payload;
      } else {
        const { payload } = await jose.jwtVerify(token, this.hsSecret!);
        return payload;
      }
    } catch (error) {
      throw new Error("Invalid refresh token");
    }
  }

  async getJwks(): Promise<any> {
    if (this.alg === "RS256" && this.publicJwks) {
      return { keys: [{ ...this.publicJwks, kid: "1" }] };
    }
    return { keys: [] };
  }
}
