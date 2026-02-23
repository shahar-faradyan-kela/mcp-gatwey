import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpServerEntity } from '../servers/entities/mcp-server.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { CommonModule } from '../common/common.module.js';
import { MetricsModule } from '../metrics/metrics.module.js';
import { RequestLogsModule } from '../request-logs/request-logs.module.js';
import { ServerRegistryService } from './registry/server-registry.service.js';
import { HealthCheckerService } from './health-checker/health-checker.service.js';
import { ToolAggregatorService } from './aggregator/tool-aggregator.service.js';
import { McpProxyService } from './proxy/mcp-proxy.service.js';
import { GatewayController } from './gateway.controller.js';
import { GatewayHealthController } from './gateway-health.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([McpServerEntity]),
    AuthModule,
    CommonModule,
    MetricsModule,
    RequestLogsModule,
  ],
  controllers: [GatewayController, GatewayHealthController],
  providers: [
    ServerRegistryService,
    HealthCheckerService,
    ToolAggregatorService,
    McpProxyService,
  ],
  exports: [ServerRegistryService],
})
export class GatewayModule {}
