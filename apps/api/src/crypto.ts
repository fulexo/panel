import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

export type EncryptedPayload = { ciphertext: string; nonce: string; key_version: number; encrypted_data_key?: string; created_at?: string; rotated_at?: string };

export class EncryptionService {
	constructor(private masterKeyHex: string, private keyVersion = 1) {}

	private deriveDataKey(): Buffer {
		// For simplicity, use random 32 bytes as data key; in production use KDF
		return randomBytes(32);
	}

	encrypt(plaintext: string): EncryptedPayload {
		const masterKey = Buffer.from(this.masterKeyHex, 'hex');
		const dataKey = this.deriveDataKey();
		// Encrypt plaintext with data key
		const iv = randomBytes(12);
		const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
		const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
		const tag = cipher.getAuthTag();
		const ciphertext = Buffer.concat([enc, tag]).toString('base64');
		// Envelope: encrypt data key with master key using AES-GCM with zero IV for brevity
		const iv2 = Buffer.alloc(12, 0);
		const c2 = createCipheriv('aes-256-gcm', masterKey, iv2);
		const edk = Buffer.concat([c2.update(dataKey), c2.final()]);
		const tag2 = c2.getAuthTag();
		const encrypted_data_key = Buffer.concat([edk, tag2]).toString('base64');
		return { ciphertext, nonce: iv.toString('base64'), key_version: this.keyVersion, encrypted_data_key, created_at: new Date().toISOString() };
	}

	decrypt(payload: EncryptedPayload): string {
		const masterKey = Buffer.from(this.masterKeyHex, 'hex');
		// Decrypt data key
		const data = Buffer.from(payload.encrypted_data_key || '', 'base64');
		const edk = data.slice(0, data.length - 16);
		const tag2 = data.slice(data.length - 16);
		const iv2 = Buffer.alloc(12, 0);
		const d2 = createDecipheriv('aes-256-gcm', masterKey, iv2);
		d2.setAuthTag(tag2);
		const dataKey = Buffer.concat([d2.update(edk), d2.final()]);
		// Decrypt payload with data key
		const iv = Buffer.from(payload.nonce, 'base64');
		const blob = Buffer.from(payload.ciphertext, 'base64');
		const enc = blob.slice(0, blob.length - 16);
		const tag = blob.slice(blob.length - 16);
		const decipher = createDecipheriv('aes-256-gcm', dataKey, iv);
		decipher.setAuthTag(tag);
		const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
		return dec.toString('utf8');
	}
}