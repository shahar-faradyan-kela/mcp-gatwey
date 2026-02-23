import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ToolAggregatorService } from '../aggregator/tool-aggregator.service.js';
import { RequestLogsService } from '../../request-logs/request-logs.service.js';
import { MetricsService } from '../../metrics/metrics.service.js';
import { LogStatus } from '../../request-logs/entities/request-log.entity.js';

@Injectable()
export class McpProxyService {
  private readonly logger = new Logger(McpProxyService.name);

  constructor(
    private readonly aggregator: ToolAggregatorService,
    private readonly requestLogService: RequestLogsService,
    private readonly metrics: MetricsService,
  ) {}

  async callTool(
    prefixedToolName: string,
    args: Record<string, unknown>,
  ): Promise<CallToolResult> {
    const start = Date.now();
    const resolved = this.aggregator.resolveServer(prefixedToolName);

    if (!resolved) {
      throw new NotFoundException(
        `Tool '${prefixedToolName}' not found in any active server`,
      );
    }

    const { alias, originalToolName, server } = resolved;

    try {
      const result = await server.client.callTool({
        name: originalToolName,
        arguments: args,
      });

      const latencyMs = Date.now() - start;
      this.metrics.requestCounter.inc({
        server_alias: alias,
        tool_name: originalToolName,
        status: 'success',
      });
      this.metrics.requestDuration.observe({ server_alias: alias }, latencyMs);

      await this.requestLogService.create({
        toolName: originalToolName,
        serverAlias: alias,
        serverId: server.entity.id,
        latencyMs,
        status: LogStatus.SUCCESS,
      });

      return result as CallToolResult;
    } catch (error) {
      const latencyMs = Date.now() - start;
      this.metrics.requestCounter.inc({
        server_alias: alias,
        tool_name: originalToolName,
        status: 'error',
      });

      await this.requestLogService.create({
        toolName: originalToolName,
        serverAlias: alias,
        serverId: server.entity.id,
        latencyMs,
        status: LogStatus.ERROR,
        errorMessage:
          error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}
