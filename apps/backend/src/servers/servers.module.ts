import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpServerEntity } from './entities/mcp-server.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { CommonModule } from '../common/common.module.js';
import { ServersController } from './servers.controller.js';
import { ServersService } from './servers.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([McpServerEntity]),
    AuthModule,
    CommonModule,
  ],
  controllers: [ServersController],
  providers: [ServersService],
  exports: [ServersService],
})
export class ServersModule {}
