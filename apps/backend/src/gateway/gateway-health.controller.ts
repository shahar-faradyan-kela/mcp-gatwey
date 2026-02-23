import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard.js';
import { ServerRegistryService } from './registry/server-registry.service.js';

@ApiTags('health')
@ApiSecurity('AdminApiKey')
@UseGuards(ApiKeyGuard)
@Controller('admin/health')
export class GatewayHealthController {
  constructor(private readonly registry: ServerRegistryService) {}

  @Get()
  @ApiOperation({
    summary: 'Get health status of all downstream MCP servers',
  })
  getHealth() {
    const servers = this.registry.getAllServers();
    return servers.map(({ entity }) => ({
      id: entity.id,
      name: entity.name,
      alias: entity.alias,
      url: entity.url,
      status: entity.status,
      isEnabled: entity.isEnabled,
      lastCheckedAt: entity.lastCheckedAt,
    }));
  }
}
