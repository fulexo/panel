import * as jose from 'jose';
import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type JwtPair = { access: string; refresh: string };

@Injectable()
export class JwtService {
	private alg = process.env.NODE_ENV === 'production' ? 'RS256' : 'HS256';
	private privateKey?: any;
	private publicKey?: any;
	private publicJwks?: any;
	private hsSecret?: Uint8Array;

	constructor(private prisma: PrismaService) {}

	async init(){
		if(this.alg === 'RS256'){
			await this.ensureActiveRsKey();
		}else{
			const secret = process.env.JWT_SECRET || randomBytes(32).toString('hex');
			this.hsSecret = new TextEncoder().encode(secret);
		}
	}

	private async ensureActiveRsKey(){
		// Try to load active key
		const active = await this.prisma.jwtKey.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } });
		if(active){
			const { publicJwk, privatePem, kid } = active as any;
			this.publicKey = await jose.importJWK(publicJwk, 'RS256');
			if(privatePem){
				this.privateKey = await jose.importPKCS8(privatePem, 'RS256');
			}
			this.publicJwks = { keys: [{ ...publicJwk, kid }] };
			return;
		}
		// Generate new keypair
		const { publicKey, privateKey } = await jose.generateKeyPair('RS256');
		this.privateKey = privateKey as any;
		this.publicKey = publicKey as any;
		const jwk = await jose.exportJWK(publicKey as any);
		const kid = `kid-${Date.now()}`;
		(jwk as any).kid = kid;
		this.publicJwks = { keys: [jwk] };
		const pkcs8 = await jose.exportPKCS8(privateKey);
		await this.prisma.jwtKey.create({ data: { kid, alg: 'RS256', publicJwk: jwk as any, privatePem: pkcs8, active: true } });
	}

	async rotateKeys(){
		if(this.alg !== 'RS256') return;
		// Deactivate current
		await this.prisma.jwtKey.updateMany({ where: { active: true }, data: { active: false, rotatedAt: new Date() } });
		// Create new
		await this.ensureActiveRsKey();
	}

	async issueTokens(payload: any): Promise<JwtPair>{
		const now = Math.floor(Date.now()/1000);
		if(this.alg==='RS256'){
			const active = await this.prisma.jwtKey.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } });
			const kid = active?.kid || 'kid-1';
			const access = await new jose.SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid }).setIssuedAt(now).setExpirationTime('15m').sign(this.privateKey);
			const refresh = await new jose.SignJWT({ sub: payload.sub, type:'refresh' }).setProtectedHeader({ alg: 'RS256', kid }).setIssuedAt(now).setExpirationTime('7d').sign(this.privateKey);
			return { access, refresh };
		}else{
			const access = await new jose.SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt(now).setExpirationTime('15m').sign(this.hsSecret!);
			const refresh = await new jose.SignJWT({ sub: payload.sub, type:'refresh' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt(now).setExpirationTime('7d').sign(this.hsSecret!);
			return { access, refresh };
		}
	}

	async verifyAccessToken(token: string): Promise<any> {
		try {
			if (this.alg === 'RS256') {
				const { payload } = await jose.jwtVerify(token, this.publicKey);
				return payload;
			} else {
				const { payload } = await jose.jwtVerify(token, this.hsSecret!);
				return payload;
			}
		} catch (error) {
			throw new Error('Invalid access token');
		}
	}

	async verifyRefreshToken(token: string): Promise<any> {
		try {
			if (this.alg === 'RS256') {
				const { payload } = await jose.jwtVerify(token, this.publicKey);
				if (payload.type !== 'refresh') {
					throw new Error('Not a refresh token');
				}
				return payload;
			} else {
				const { payload } = await jose.jwtVerify(token, this.hsSecret!);
				if ((payload as any).type !== 'refresh') {
					throw new Error('Not a refresh token');
				}
				return payload;
			}
		} catch (error) {
			throw new Error('Invalid refresh token');
		}
	}

	getJwks(){ return this.alg==='RS256' ? this.publicJwks : { keys: [] }; }
}