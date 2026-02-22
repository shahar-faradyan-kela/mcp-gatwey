import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt.guard.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';

@Module({
  providers: [JwtAuthGuard, ApiKeyGuard],
  exports: [JwtAuthGuard, ApiKeyGuard],
})
export class AuthModule {}
