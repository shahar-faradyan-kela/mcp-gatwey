import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import { RequestLogsService } from './request-logs.service.js';
import { QueryLogsDto } from './dto/query-logs.dto.js';

@ApiTags('logs')
@ApiSecurity('AdminApiKey')
@UseGuards(ApiKeyGuard)
@Controller('admin/logs')
export class RequestLogsController {
  constructor(private readonly requestLogsService: RequestLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Query request logs with optional filters and pagination',
  })
  findAll(@Query() query: QueryLogsDto) {
    return this.requestLogsService.findAll(query);
  }
}
