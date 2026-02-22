import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm' as const;

  constructor(private config: ConfigService) {
    this.key = Buffer.from(config.get<string>('encryption.key')!, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + authTag.toString('hex') + encrypted.toString('hex');
  }

  decrypt(ciphertext: string): string {
    const iv = Buffer.from(ciphertext.slice(0, 24), 'hex');
    const authTag = Buffer.from(ciphertext.slice(24, 56), 'hex');
    const encrypted = Buffer.from(ciphertext.slice(56), 'hex');
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
