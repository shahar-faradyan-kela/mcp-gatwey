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
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  McpServerEntity,
  AuthType,
  ServerStatus,
} from '../../servers/entities/mcp-server.entity.js';
import { EncryptionService } from '../../common/encryption/encryption.service.js';

export interface ActiveServer {
  entity: McpServerEntity;
  client: Client;
}

@Injectable()
export class ServerRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServerRegistryService.name);
  private servers: Map<string, ActiveServer> = new Map();
  private reloadTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    @InjectRepository(McpServerEntity)
    private readonly serversRepo: Repository<McpServerEntity>,
    private readonly config: ConfigService,
    private readonly encryption: EncryptionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
    this.reloadTimer = setInterval(
      () => {
        this.reload().catch((err) =>
          this.logger.error(`Reload failed: ${err}`),
        );
      },
      this.config.get<number>('gateway.reloadIntervalMs') ?? 60000,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.reloadTimer) clearInterval(this.reloadTimer);
    for (const { client } of this.servers.values()) {
      await client.close().catch(() => {});
    }
  }

  async reload(): Promise<void> {
    const dbServers = await this.serversRepo.find({
      where: { isEnabled: true },
    });
    const dbAliases = new Set(dbServers.map((s) => s.alias));

    // Remove servers that are no longer in DB or have been disabled
    for (const [alias, active] of this.servers.entries()) {
      if (!dbAliases.has(alias)) {
        await active.client.close().catch(() => {});
        this.servers.delete(alias);
        this.logger.log(`Disconnected removed server: ${alias}`);
      }
    }

    // Add or reconnect servers
    for (const entity of dbServers) {
      const existing = this.servers.get(entity.alias);
      const urlChanged = existing && existing.entity.url !== entity.url;
      if (!existing || urlChanged) {
        if (urlChanged && existing) {
          await existing.client.close().catch(() => {});
        }
        await this.connectServer(entity);
      } else {
        // Update entity metadata in memory (name, tags, etc.)
        existing.entity = entity;
      }
    }
  }

  private async connectServer(entity: McpServerEntity): Promise<void> {
    try {
      const headers: Record<string, string> = {};
      if (entity.authType !== AuthType.NONE && entity.authCredentialsEncrypted) {
        const credential = this.encryption.decrypt(
          entity.authCredentialsEncrypted,
        );
        if (entity.authType === AuthType.BEARER) {
          headers['Authorization'] = `Bearer ${credential}`;
        } else if (entity.authType === AuthType.API_KEY) {
          headers['X-API-Key'] = credential;
        }
      }

      const client = new Client({ name: 'mcp-gateway', version: '1.0.0' });
      const transport = new StreamableHTTPClientTransport(
        new URL(entity.url),
        { requestInit: { headers } },
      );
      await client.connect(transport);
      this.servers.set(entity.alias, { entity, client });
      this.logger.log(
        `Connected to server: ${entity.alias} (${entity.url})`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to connect to server ${entity.alias}: ${err}`,
      );
      await this.serversRepo.update(entity.id, {
        status: ServerStatus.DOWN,
        lastCheckedAt: new Date(),
      });
    }
  }

  getActiveServers(): ActiveServer[] {
    return Array.from(this.servers.values()).filter(
      (s) => s.entity.status !== ServerStatus.DOWN,
    );
  }

  getAllServers(): ActiveServer[] {
    return Array.from(this.servers.values());
  }

  getServerByAlias(alias: string): ActiveServer | undefined {
    return this.servers.get(alias);
  }
}
