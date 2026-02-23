import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { RequestLogEntity } from './entities/request-log.entity.js';
import { RequestLogsService } from './request-logs.service.js';
import { RequestLogsController } from './request-logs.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([RequestLogEntity]), AuthModule],
  controllers: [RequestLogsController],
  providers: [RequestLogsService],
  exports: [RequestLogsService],
})
export class RequestLogsModule {}
