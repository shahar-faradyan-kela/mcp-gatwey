import { Injectable } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  readonly requestCounter: Counter<string>;
  readonly requestDuration: Histogram<string>;
  readonly activeDownstreamServers: Gauge<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.requestCounter = new Counter({
      name: 'mcp_gateway_requests_total',
      help: 'Total MCP tool calls routed through the gateway',
      labelNames: ['server_alias', 'tool_name', 'status'],
      registers: [this.registry],
    });

    this.requestDuration = new Histogram({
      name: 'mcp_gateway_request_duration_ms',
      help: 'Duration of MCP tool calls in milliseconds',
      labelNames: ['server_alias'],
      buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
      registers: [this.registry],
    });

    this.activeDownstreamServers = new Gauge({
      name: 'mcp_gateway_active_servers',
      help: 'Number of currently active (UP) downstream MCP servers',
      registers: [this.registry],
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
