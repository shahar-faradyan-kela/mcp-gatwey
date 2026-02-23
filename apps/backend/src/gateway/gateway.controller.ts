import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
import * as express from 'express';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
import { ToolAggregatorService } from './aggregator/tool-aggregator.service.js';
import { McpProxyService } from './proxy/mcp-proxy.service.js';

@UseGuards(JwtAuthGuard)
@Controller('mcp')
export class GatewayController {
  private readonly mcpServer: Server;

  constructor(
    private readonly aggregator: ToolAggregatorService,
    private readonly proxy: McpProxyService,
  ) {
    this.mcpServer = new Server(
      { name: 'mcp-gateway', version: '1.0.0' },
      { capabilities: { tools: {} } },
    );

    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: await this.aggregator.getAggregatedTools(),
    }));

    this.mcpServer.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        return this.proxy.callTool(
          request.params.name,
          (request.params.arguments as Record<string, unknown>) ?? {},
        );
      },
    );
  }

  @All()
  async handleMcp(@Req() req: express.Request, @Res() res: express.Response): Promise<void> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });
    await this.mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on('close', () => {
      transport.close().catch(() => {});
    });
  }
}
