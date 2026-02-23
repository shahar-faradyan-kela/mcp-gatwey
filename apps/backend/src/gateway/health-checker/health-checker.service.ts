import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  McpServerEntity,
  ServerStatus,
} from '../../servers/entities/mcp-server.entity.js';
import { ServerRegistryService } from '../registry/server-registry.service.js';
import { MetricsService } from '../../metrics/metrics.service.js';

@Injectable()
export class HealthCheckerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HealthCheckerService.name);
  private checkTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly registry: ServerRegistryService,
    @InjectRepository(McpServerEntity)
    private readonly serversRepo: Repository<McpServerEntity>,
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.checkTimer = setInterval(
      () => {
        this.runChecks().catch((err) =>
          this.logger.error(`Health check run failed: ${err}`),
        );
      },
      this.config.get<number>('gateway.healthCheckIntervalMs') ?? 30000,
    );
  }

  onModuleDestroy(): void {
    if (this.checkTimer) clearInterval(this.checkTimer);
  }

  async runChecks(): Promise<void> {
    const servers = this.registry.getAllServers();
    const results = await Promise.allSettled(
      servers.map(({ entity, client }) => this.checkServer(entity, client)),
    );

    const upCount = results.filter(
      (r) => r.status === 'fulfilled',
    ).length;
    this.metrics.activeDownstreamServers.set(upCount);
  }

  private async checkServer(
    entity: McpServerEntity,
    client: Client,
  ): Promise<void> {
    try {
      await Promise.race([
        client.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000),
        ),
      ]);
      await this.serversRepo.update(entity.id, {
        status: ServerStatus.UP,
        lastCheckedAt: new Date(),
      });
      entity.status = ServerStatus.UP;
    } catch {
      this.logger.warn(`Health check failed for server: ${entity.alias}`);
      await this.serversRepo.update(entity.id, {
        status: ServerStatus.DOWN,
        lastCheckedAt: new Date(),
      });
      entity.status = ServerStatus.DOWN;
      throw new Error(`Server ${entity.alias} is DOWN`);
    }
  }
}
