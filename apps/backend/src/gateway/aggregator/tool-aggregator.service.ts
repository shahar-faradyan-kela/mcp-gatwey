import { Injectable, Logger } from '@nestjs/common';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  ServerRegistryService,
  type ActiveServer,
} from '../registry/server-registry.service.js';

interface CacheEntry {
  tools: Tool[];
  expiresAt: number;
}

@Injectable()
export class ToolAggregatorService {
  private readonly logger = new Logger(ToolAggregatorService.name);
  private cache: CacheEntry | null = null;
  private readonly cacheTtlMs = 5000;

  constructor(private readonly registry: ServerRegistryService) {}

  async getAggregatedTools(): Promise<Tool[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.tools;
    }

    const servers = this.registry.getActiveServers();
    const toolArrays = await Promise.allSettled(
      servers.map(async ({ entity, client }) => {
        const { tools } = await client.listTools();
        return tools.map((tool) => ({
          ...tool,
          name: `${entity.alias}__${tool.name}`,
          description: `[${entity.alias}] ${tool.description ?? ''}`.trim(),
        }));
      }),
    );

    const tools: Tool[] = [];
    for (const result of toolArrays) {
      if (result.status === 'fulfilled') {
        tools.push(...result.value);
      } else {
        this.logger.warn(
          `Failed to list tools from a server: ${result.reason}`,
        );
      }
    }

    this.cache = { tools, expiresAt: Date.now() + this.cacheTtlMs };
    return tools;
  }

  resolveServer(
    prefixedToolName: string,
  ): { alias: string; originalToolName: string; server: ActiveServer } | null {
    const separatorIndex = prefixedToolName.indexOf('__');
    if (separatorIndex === -1) return null;

    const alias = prefixedToolName.slice(0, separatorIndex);
    const originalToolName = prefixedToolName.slice(separatorIndex + 2);
    const server = this.registry.getServerByAlias(alias);

    if (!server) return null;
    return { alias, originalToolName, server };
  }
}
