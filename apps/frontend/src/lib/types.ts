export interface McpServer {
  id: string;
  name: string;
  alias: string;
  url: string;
  description: string | null;
  tags: string[];
  authType: 'none' | 'bearer' | 'api_key';
  hasAuthCredential: boolean;
  isEnabled: boolean;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServerDto {
  name: string;
  alias: string;
  url: string;
  description?: string;
  tags?: string[];
  authType?: 'none' | 'bearer' | 'api_key';
  authCredential?: string;
  isEnabled?: boolean;
}

export interface ServerHealth {
  id: string;
  name: string;
  alias: string;
  url: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  lastCheckedAt: string | null;
}

export interface RequestLog {
  id: string;
  toolName: string;
  serverAlias: string;
  serverId: string | null;
  latencyMs: number;
  status: 'success' | 'error';
  errorMessage: string | null;
  createdAt: string;
}
