# MCP Gateway — Comprehensive Implementation Plan

## Context

This plan describes the full implementation of an **MCP (Model Context Protocol) Gateway** — a centralized aggregator and router that allows AI models to connect to a single endpoint which dynamically merges and routes tool calls across multiple downstream MCP servers.

**Problem it solves:** Teams accumulate many specialized MCP servers (GitHub, Jira, databases, internal tools, etc.). Without a gateway, each AI client must be individually configured for every server. The Gateway provides one stable endpoint; the underlying server fleet is managed dynamically via a database-driven admin interface.

**Key architectural decisions confirmed during planning:**

| Decision | Choice |
|---|---|
| MCP Transport | HTTP + Streamable HTTP (SSE) |
| Gateway Mode | Tool Aggregation — all server tools merged into unified list |
| Name Conflict Resolution | Namespace prefix: `{alias}__{tool_name}` |
| Admin UI Scope | CRUD + Live Health Dashboard + Request Logs viewer |
| Health Checking | Periodic background checks; mark unavailable servers DOWN |
| Auth Placeholders | JWT Guard (MCP endpoint) + API Key Guard (Admin API) |
| UI Library | Tailwind CSS v3 + shadcn/ui |
| Observability | Winston logging, /health endpoint, /metrics (Prometheus) |
| Hot Reload | Periodic DB polling (configurable interval) |
| Request Logs | Persisted to PostgreSQL |
| ORM | TypeORM |
| Repo Layout | `apps/` monorepo (backend + frontend) |
| Package Manager | npm |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend Framework | NestJS (latest stable) |
| Language | TypeScript 5.x, strict mode |
| ORM | TypeORM |
| Database | PostgreSQL 16 |
| MCP SDK | `@modelcontextprotocol/sdk` (latest) |
| Frontend | React 18 + Vite 5 |
| UI Components | Tailwind CSS v3 + shadcn/ui |
| Logging | Winston + nest-winston |
| Metrics | prom-client |
| API Docs | @nestjs/swagger |
| Testing | Jest + @nestjs/testing + supertest |
| Encryption | Node.js built-in `crypto` (AES-256-GCM) |
| Containerization | Docker + Docker Compose v3 |
| Package Manager | npm |

---

## Repository Structure

```
mcp-gatwey/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── auth/
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt.guard.ts
│   │   │   │   │   └── api-key.guard.ts
│   │   │   │   ├── decorators/
│   │   │   │   │   └── public.decorator.ts
│   │   │   │   └── auth.module.ts
│   │   │   ├── servers/
│   │   │   │   ├── dto/
│   │   │   │   │   ├── create-server.dto.ts
│   │   │   │   │   └── update-server.dto.ts
│   │   │   │   ├── entities/
│   │   │   │   │   └── mcp-server.entity.ts
│   │   │   │   ├── servers.controller.ts
│   │   │   │   ├── servers.service.ts
│   │   │   │   └── servers.module.ts
│   │   │   ├── gateway/
│   │   │   │   ├── registry/
│   │   │   │   │   └── server-registry.service.ts
│   │   │   │   ├── health-checker/
│   │   │   │   │   └── health-checker.service.ts
│   │   │   │   ├── aggregator/
│   │   │   │   │   └── tool-aggregator.service.ts
│   │   │   │   ├── proxy/
│   │   │   │   │   └── mcp-proxy.service.ts
│   │   │   │   ├── gateway.controller.ts
│   │   │   │   └── gateway.module.ts
│   │   │   ├── request-logs/
│   │   │   │   ├── entities/
│   │   │   │   │   └── request-log.entity.ts
│   │   │   │   ├── dto/
│   │   │   │   │   └── query-logs.dto.ts
│   │   │   │   ├── request-logs.controller.ts
│   │   │   │   ├── request-logs.service.ts
│   │   │   │   └── request-logs.module.ts
│   │   │   ├── health/
│   │   │   │   └── health.module.ts
│   │   │   ├── metrics/
│   │   │   │   ├── metrics.service.ts
│   │   │   │   ├── metrics.controller.ts
│   │   │   │   └── metrics.module.ts
│   │   │   └── common/
│   │   │       ├── interceptors/
│   │   │       │   └── logging.interceptor.ts
│   │   │       ├── config/
│   │   │       │   └── configuration.ts
│   │   │       └── encryption/
│   │   │           └── encryption.service.ts
│   │   ├── test/
│   │   │   ├── servers.e2e-spec.ts
│   │   │   └── jest-e2e.json
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── tsconfig.build.json
│   └── frontend/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   └── ui/          # shadcn/ui generated components
│       │   ├── pages/
│       │   │   ├── ServersPage.tsx
│       │   │   ├── HealthPage.tsx
│       │   │   └── LogsPage.tsx
│       │   └── lib/
│       │       ├── api.ts       # Typed API client (fetch wrapper)
│       │       └── utils.ts
│       ├── index.html
│       ├── Dockerfile
│       ├── package.json
│       ├── tailwind.config.ts
│       ├── components.json      # shadcn/ui config
│       └── vite.config.ts
├── docker-compose.yml           # Production-ready compose
├── docker-compose.dev.yml       # Dev overrides (hot-reload volumes)
├── .env.example
└── PLAN.md
```

---

## Database Schema

### Table: `mcp_servers`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, default gen_random_uuid() | Primary key |
| name | VARCHAR(255) | NOT NULL | Human-readable display name |
| alias | VARCHAR(100) | NOT NULL, UNIQUE | Short identifier used as tool prefix (e.g. `github`) |
| url | TEXT | NOT NULL | Base URL of the downstream MCP server |
| description | TEXT | nullable | Optional human description |
| tags | TEXT[] | nullable, default '{}' | Organizational tags |
| auth_type | ENUM | NOT NULL, default 'none' | Values: `none`, `bearer`, `api_key` |
| auth_credentials_encrypted | TEXT | nullable | AES-256-GCM encrypted JSON `{token: string}` or `{key: string}` |
| is_enabled | BOOLEAN | NOT NULL, default true | Admin enable/disable toggle |
| status | ENUM | NOT NULL, default 'UNKNOWN' | Values: `UP`, `DOWN`, `UNKNOWN` |
| last_checked_at | TIMESTAMP | nullable | Timestamp of last health check attempt |
| created_at | TIMESTAMP | NOT NULL | Auto-set by TypeORM `@CreateDateColumn` |
| updated_at | TIMESTAMP | NOT NULL | Auto-set by TypeORM `@UpdateDateColumn` |

### Table: `request_logs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK, default gen_random_uuid() | Primary key |
| tool_name | VARCHAR(255) | NOT NULL | Tool name WITHOUT prefix (original downstream name) |
| server_alias | VARCHAR(100) | NOT NULL | Alias of the server that handled the call |
| server_id | UUID | FK → mcp_servers.id, SET NULL | Reference to the server record |
| latency_ms | INTEGER | NOT NULL | Milliseconds from Gateway receipt to response |
| status | ENUM | NOT NULL | Values: `success`, `error` |
| error_message | TEXT | nullable | Error detail if status=error |
| created_at | TIMESTAMP | NOT NULL | Auto-set by TypeORM `@CreateDateColumn` |

---

## MCP Gateway Data Flow

```
AI Client
   │
   ├─ GET /mcp  ──► establish SSE stream (Streamable HTTP)
   └─ POST /mcp ──► send JSON-RPC requests (tool calls, list_tools, etc.)
          │
          ▼
┌─────────────────────────────────────────────┐
│            GatewayController                │
│  NestJS controller wrapping MCP SDK Server  │
│  StreamableHTTPServerTransport per session  │
└──────────────────┬──────────────────────────┘
                   │  list_tools request
                   ▼
┌─────────────────────────────────────────────┐
│          ToolAggregatorService              │
│  - Reads all UP+enabled servers from        │
│    ServerRegistryService (in-memory cache)  │
│  - Prefixes each tool: {alias}__{name}      │
│  - Returns merged tool list                 │
└──────────────────┬──────────────────────────┘
                   │  call_tool request
                   ▼
┌─────────────────────────────────────────────┐
│            McpProxyService                  │
│  1. Parse prefix from tool name             │
│  2. Resolve server URL from registry        │
│  3. Forward call via MCP Client (SDK)       │
│  4. Measure latency                         │
│  5. Persist log entry via RequestLogService │
│  6. Return result to GatewayController      │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
[Downstream Server A]  [Downstream Server B]
  (MCP SDK Client)       (MCP SDK Client)

Background services (run independently):
  ServerRegistryService ─ polls DB every RELOAD_INTERVAL_MS (default 60000)
  HealthCheckerService  ─ pings each enabled server every HEALTH_CHECK_INTERVAL_MS (default 30000)
```

---

## Environment Variables (.env.example)

```ini
# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=mcp_gateway
DATABASE_USER=postgres
DATABASE_PASSWORD=changeme

# Backend
PORT=3000
NODE_ENV=development

# Auth (placeholder — will be populated when internal package is integrated)
JWT_SECRET=dev-secret-change-in-production
ADMIN_API_KEY=dev-admin-key-change-in-production

# Encryption key for storing downstream auth credentials (32-byte hex)
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000

# Gateway behavior
RELOAD_INTERVAL_MS=60000
HEALTH_CHECK_INTERVAL_MS=30000

# CORS — origins allowed to access the Admin API
CORS_ORIGINS=http://localhost:5173

# Frontend
VITE_API_BASE_URL=http://localhost:3000
VITE_ADMIN_API_KEY=dev-admin-key-change-in-production
```

---

## Epics Overview

| # | Epic | Goal |
|---|---|---|
| 1 | Project Foundation & Infrastructure | Monorepo, Docker Compose, env config |
| 2 | Backend Foundation (NestJS + TypeORM) | NestJS bootstrap, DB connection, entities, migrations |
| 3 | Auth Module (Placeholder) | JWT + API Key guards, pass-through in dev |
| 4 | Admin CRUD API | RESTful server management, Swagger docs |
| 5 | MCP Gateway Core Engine | Registry, health checker, aggregator, proxy, SSE endpoint |
| 6 | Observability Stack | Winston logging, /health, /metrics, request logs API |
| 7 | Admin Frontend | React + Vite + shadcn/ui: CRUD, health dashboard, logs viewer |
| 8 | Testing | Unit + integration tests for backend |
| 9 | Final Polish | README, verified docker-compose end-to-end |

---

## Epic 1: Project Foundation & Infrastructure

**Goal:** Create the complete monorepo skeleton, Docker infrastructure, and environment configuration so that all subsequent code can be developed and run consistently.

---

### Task 1.1 — Initialize Monorepo Directory Structure

**Description:** Create the top-level `apps/` monorepo layout and all placeholder files needed before NestJS and Vite initialization.

**Sub-tasks:**

1. **Create directory skeleton:**
   ```
   mkdir -p apps/backend apps/frontend
   ```
   Create these empty directories (they will be populated in subsequent tasks):
   - `apps/backend/src/auth/guards/`
   - `apps/backend/src/auth/decorators/`
   - `apps/backend/src/servers/dto/`
   - `apps/backend/src/servers/entities/`
   - `apps/backend/src/gateway/registry/`
   - `apps/backend/src/gateway/health-checker/`
   - `apps/backend/src/gateway/aggregator/`
   - `apps/backend/src/gateway/proxy/`
   - `apps/backend/src/request-logs/entities/`
   - `apps/backend/src/request-logs/dto/`
   - `apps/backend/src/health/`
   - `apps/backend/src/metrics/`
   - `apps/backend/src/common/interceptors/`
   - `apps/backend/src/common/config/`
   - `apps/backend/src/common/encryption/`
   - `apps/backend/test/`

2. **Create `.env.example`** at repo root with all variables shown in the Environment Variables section above. Add a comment above each variable explaining its purpose.

3. **Create root `.gitignore`** containing:
   ```
   node_modules/
   dist/
   .env
   *.env.local
   .DS_Store
   coverage/
   ```

**Acceptance Criteria:**
- Running `ls apps/` shows `backend/` and `frontend/`
- `.env.example` exists at repo root with all required variables and comments
- `.gitignore` is present

---

### Task 1.2 — Docker & Docker Compose Setup

**Description:** Create Dockerfiles for both apps and a `docker-compose.yml` that orchestrates PostgreSQL, the NestJS backend, and the React frontend.

**Sub-tasks:**

1. **Create `apps/backend/Dockerfile`** using multi-stage build:
   - Stage 1 (`builder`): `FROM node:20-alpine AS builder`, set `WORKDIR /app`, copy `package*.json`, run `npm ci`, copy `src/`, run `npm run build`
   - Stage 2 (`runner`): `FROM node:20-alpine`, set `WORKDIR /app`, copy `--from=builder /app/dist ./dist`, copy `--from=builder /app/node_modules ./node_modules`, copy `package.json`, expose `3000`, set `CMD ["node", "dist/main.js"]`

2. **Create `apps/frontend/Dockerfile`** using multi-stage build:
   - Stage 1 (`builder`): `FROM node:20-alpine AS builder`, `WORKDIR /app`, copy `package*.json`, run `npm ci`, copy source, run `npm run build`
   - Stage 2 (`runner`): `FROM node:20-alpine`, install `serve` globally, copy `--from=builder /app/dist ./dist`, expose `80`, `CMD ["serve", "-s", "dist", "-l", "80"]`

3. **Create `docker-compose.yml`** at repo root:
   ```yaml
   version: '3.9'
   services:
     postgres:
       image: postgres:16-alpine
       environment:
         POSTGRES_DB: ${DATABASE_NAME}
         POSTGRES_USER: ${DATABASE_USER}
         POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
       volumes:
         - pg_data:/var/lib/postgresql/data
       ports:
         - "5432:5432"
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U ${DATABASE_USER} -d ${DATABASE_NAME}"]
         interval: 10s
         timeout: 5s
         retries: 5

     backend:
       build:
         context: ./apps/backend
         dockerfile: Dockerfile
       env_file: .env
       environment:
         DATABASE_HOST: postgres
       ports:
         - "${PORT:-3000}:3000"
       depends_on:
         postgres:
           condition: service_healthy

     frontend:
       build:
         context: ./apps/frontend
         dockerfile: Dockerfile
       ports:
         - "80:80"
       depends_on:
         - backend

   volumes:
     pg_data:
   ```

4. **Create `docker-compose.dev.yml`** at repo root for local development with hot-reload:
   ```yaml
   version: '3.9'
   services:
     backend:
       build:
         context: ./apps/backend
         target: builder
       command: npm run start:dev
       volumes:
         - ./apps/backend/src:/app/src
       environment:
         NODE_ENV: development

     frontend:
       image: node:20-alpine
       working_dir: /app
       command: npm run dev -- --host
       volumes:
         - ./apps/frontend:/app
       ports:
         - "5173:5173"
   ```

**Acceptance Criteria:**
- `docker compose config` validates without errors
- Both Dockerfiles use multi-stage builds
- `docker compose up` (after all code is written) starts all 3 services
- PostgreSQL healthcheck is defined

---

### Task 1.3 — Environment Configuration Module

**Description:** Create a typed configuration module in NestJS that reads all environment variables with validation using `joi`.

**Sub-tasks:**

1. **Dependencies to install** (include in Task 2.1 install command):
   `@nestjs/config`, `joi`

2. **Create `apps/backend/src/common/config/configuration.ts`**:
   ```typescript
   export default () => ({
     port: parseInt(process.env.PORT ?? '3000', 10),
     nodeEnv: process.env.NODE_ENV ?? 'development',
     database: {
       host: process.env.DATABASE_HOST,
       port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
       name: process.env.DATABASE_NAME,
       user: process.env.DATABASE_USER,
       password: process.env.DATABASE_PASSWORD,
     },
     auth: {
       jwtSecret: process.env.JWT_SECRET,
       adminApiKey: process.env.ADMIN_API_KEY,
     },
     encryption: {
       key: process.env.ENCRYPTION_KEY,
     },
     gateway: {
       reloadIntervalMs: parseInt(process.env.RELOAD_INTERVAL_MS ?? '60000', 10),
       healthCheckIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS ?? '30000', 10),
     },
     corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
   });
   ```

3. **Register `ConfigModule` in `app.module.ts`** with `isGlobal: true`, `load: [configuration]`, and a `joi` validation schema:
   ```typescript
   ConfigModule.forRoot({
     isGlobal: true,
     load: [configuration],
     validationSchema: Joi.object({
       PORT: Joi.number().default(3000),
       NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
       DATABASE_HOST: Joi.string().required(),
       DATABASE_PORT: Joi.number().default(5432),
       DATABASE_NAME: Joi.string().required(),
       DATABASE_USER: Joi.string().required(),
       DATABASE_PASSWORD: Joi.string().required(),
       JWT_SECRET: Joi.string().required(),
       ADMIN_API_KEY: Joi.string().required(),
       ENCRYPTION_KEY: Joi.string().length(64).required(),
       RELOAD_INTERVAL_MS: Joi.number().default(60000),
       HEALTH_CHECK_INTERVAL_MS: Joi.number().default(30000),
       CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
     }),
   })
   ```

**Acceptance Criteria:**
- Application fails to start if required env vars are missing (joi throws descriptive error)
- `ConfigService` can be injected anywhere and typed values are accessible

---

## Epic 2: Backend Foundation (NestJS + TypeORM)

**Goal:** Bootstrap the NestJS application with TypeORM connected to PostgreSQL, define all database entities, and set up TypeORM migrations.

---

### Task 2.1 — NestJS Project Initialization

**Description:** Initialize NestJS in `apps/backend/` and install all required npm packages.

**Sub-tasks:**

1. **Initialize NestJS** in `apps/backend/`:
   ```bash
   cd apps/backend
   npx @nestjs/cli new . --package-manager npm --skip-git --strict
   ```
   The `--strict` flag enables TypeScript strict mode.

2. **Install production dependencies**:
   ```bash
   npm install \
     @nestjs/config @nestjs/typeorm @nestjs/swagger @nestjs/terminus \
     typeorm pg \
     @modelcontextprotocol/sdk \
     nest-winston winston \
     prom-client \
     class-validator class-transformer \
     joi \
     uuid
   ```

3. **Install dev dependencies**:
   ```bash
   npm install --save-dev \
     @types/uuid \
     @types/node \
     @nestjs/testing \
     supertest @types/supertest
   ```

4. **Update `tsconfig.json`** to ensure:
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "strictNullChecks": true,
       "noImplicitAny": true,
       "esModuleInterop": true,
       "emitDecoratorMetadata": true,
       "experimentalDecorators": true
     }
   }
   ```

5. **Update `apps/backend/package.json` scripts** to add:
   ```json
   {
     "typeorm": "typeorm-ts-node-commonjs",
     "migration:generate": "npm run typeorm -- migration:generate",
     "migration:run": "npm run typeorm -- migration:run -d src/data-source.ts",
     "migration:revert": "npm run typeorm -- migration:revert -d src/data-source.ts"
   }
   ```

6. **Create `apps/backend/src/data-source.ts`** (TypeORM CLI data source config):
   ```typescript
   import { DataSource } from 'typeorm';
   import { McpServerEntity } from './servers/entities/mcp-server.entity';
   import { RequestLogEntity } from './request-logs/entities/request-log.entity';
   import * as dotenv from 'dotenv';
   dotenv.config({ path: '../../.env' });

   export default new DataSource({
     type: 'postgres',
     host: process.env.DATABASE_HOST ?? 'localhost',
     port: Number(process.env.DATABASE_PORT ?? 5432),
     database: process.env.DATABASE_NAME,
     username: process.env.DATABASE_USER,
     password: process.env.DATABASE_PASSWORD,
     entities: [McpServerEntity, RequestLogEntity],
     migrations: ['src/migrations/*.ts'],
   });
   ```

**Acceptance Criteria:**
- `npm run build` in `apps/backend/` compiles without TypeScript errors
- `npm run start:dev` starts the server (database connection succeeds after Task 2.2)

---

### Task 2.2 — TypeORM PostgreSQL Integration

**Description:** Connect TypeORM to PostgreSQL via the NestJS module system.

**Sub-tasks:**

1. **Register `TypeOrmModule` in `app.module.ts`**:
   ```typescript
   TypeOrmModule.forRootAsync({
     inject: [ConfigService],
     useFactory: (config: ConfigService) => ({
       type: 'postgres',
       host: config.get<string>('database.host'),
       port: config.get<number>('database.port'),
       database: config.get<string>('database.name'),
       username: config.get<string>('database.user'),
       password: config.get<string>('database.password'),
       entities: [McpServerEntity, RequestLogEntity],
       migrations: ['dist/migrations/*.js'],
       migrationsRun: true,  // auto-run migrations on startup
       synchronize: false,   // NEVER use synchronize in production
       logging: config.get<string>('nodeEnv') === 'development',
     }),
   })
   ```
   `migrationsRun: true` ensures the DB schema is always up-to-date on container start.

2. **Enable global `ValidationPipe` in `main.ts`**:
   ```typescript
   app.useGlobalPipes(new ValidationPipe({
     whitelist: true,
     forbidNonWhitelisted: true,
     transform: true,
     transformOptions: { enableImplicitConversion: true },
   }));
   ```

3. **Enable CORS in `main.ts`** using the `corsOrigins` config value:
   ```typescript
   app.enableCors({ origin: config.get<string[]>('corsOrigins') });
   ```

4. **Set global API prefix** in `main.ts`, excluding the MCP endpoint:
   ```typescript
   app.setGlobalPrefix('api', {
     exclude: [{ path: 'mcp', method: RequestMethod.ALL }],
   });
   ```
   This exposes the MCP endpoint at `/mcp` and all Admin REST routes at `/api/...`.

**Acceptance Criteria:**
- Backend starts and logs a successful PostgreSQL connection
- Invalid request bodies are rejected with `400 Bad Request` and descriptive field errors
- MCP endpoint is reachable at `/mcp` (no `/api` prefix)

---

### Task 2.3 — Database Entities & Migrations

**Description:** Create the two TypeORM entities and generate the initial migration file.

**Sub-tasks:**

1. **Create `apps/backend/src/servers/entities/mcp-server.entity.ts`**:
   ```typescript
   import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

   export enum AuthType { NONE = 'none', BEARER = 'bearer', API_KEY = 'api_key' }
   export enum ServerStatus { UP = 'UP', DOWN = 'DOWN', UNKNOWN = 'UNKNOWN' }

   @Entity('mcp_servers')
   export class McpServerEntity {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @Column({ length: 255 })
     name: string;

     @Column({ length: 100, unique: true })
     alias: string;

     @Column('text')
     url: string;

     @Column({ type: 'text', nullable: true })
     description: string | null;

     @Column({ type: 'text', array: true, default: '{}' })
     tags: string[];

     @Column({ type: 'enum', enum: AuthType, default: AuthType.NONE })
     authType: AuthType;

     @Column({ type: 'text', nullable: true })
     authCredentialsEncrypted: string | null;

     @Column({ default: true })
     isEnabled: boolean;

     @Column({ type: 'enum', enum: ServerStatus, default: ServerStatus.UNKNOWN })
     status: ServerStatus;

     @Column({ type: 'timestamp', nullable: true })
     lastCheckedAt: Date | null;

     @CreateDateColumn()
     createdAt: Date;

     @UpdateDateColumn()
     updatedAt: Date;
   }
   ```

2. **Create `apps/backend/src/request-logs/entities/request-log.entity.ts`**:
   ```typescript
   import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
   import { McpServerEntity } from '../../servers/entities/mcp-server.entity';

   export enum LogStatus { SUCCESS = 'success', ERROR = 'error' }

   @Entity('request_logs')
   export class RequestLogEntity {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @Column({ length: 255 })
     toolName: string;

     @Column({ length: 100 })
     serverAlias: string;

     @ManyToOne(() => McpServerEntity, { nullable: true, onDelete: 'SET NULL' })
     @JoinColumn({ name: 'server_id' })
     server: McpServerEntity | null;

     @Column({ name: 'server_id', nullable: true })
     serverId: string | null;

     @Column('int')
     latencyMs: number;

     @Column({ type: 'enum', enum: LogStatus })
     status: LogStatus;

     @Column({ type: 'text', nullable: true })
     errorMessage: string | null;

     @CreateDateColumn()
     createdAt: Date;
   }
   ```

3. **Generate the initial migration**:
   ```bash
   npm run migration:generate -- src/migrations/InitialSchema
   ```
   This creates `src/migrations/<timestamp>-InitialSchema.ts`. Commit this file to version control.

4. **Add indexes** on `request_logs.created_at` and `request_logs.server_id` in the generated migration for efficient Admin UI log queries.

**Acceptance Criteria:**
- `npm run migration:run` applies without errors
- PostgreSQL shows `mcp_servers` and `request_logs` tables with correct columns and types
- Enum columns use PostgreSQL native ENUM types

---

### Task 2.4 — Encryption Service

**Description:** Create a reusable `EncryptionService` that encrypts and decrypts auth credentials using AES-256-GCM with a key from config.

**Sub-tasks:**

1. **Create `apps/backend/src/common/encryption/encryption.service.ts`**:
   ```typescript
   import { Injectable } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';
   import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

   @Injectable()
   export class EncryptionService {
     private readonly key: Buffer;
     private readonly algorithm = 'aes-256-gcm';

     constructor(private config: ConfigService) {
       this.key = Buffer.from(config.get<string>('encryption.key')!, 'hex');
     }

     encrypt(plaintext: string): string {
       const iv = randomBytes(12);
       const cipher = createCipheriv(this.algorithm, this.key, iv);
       const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
       const authTag = cipher.getAuthTag();
       // Format: iv(24 hex chars) + authTag(32 hex chars) + encrypted(hex)
       return iv.toString('hex') + authTag.toString('hex') + encrypted.toString('hex');
     }

     decrypt(ciphertext: string): string {
       const iv = Buffer.from(ciphertext.slice(0, 24), 'hex');
       const authTag = Buffer.from(ciphertext.slice(24, 56), 'hex');
       const encrypted = Buffer.from(ciphertext.slice(56), 'hex');
       const decipher = createDecipheriv(this.algorithm, this.key, iv);
       decipher.setAuthTag(authTag);
       return decipher.update(encrypted) + decipher.final('utf8');
     }
   }
   ```

2. **Create `apps/backend/src/common/common.module.ts`** that declares and exports `EncryptionService`. Import `CommonModule` in `AppModule`.

**Acceptance Criteria:**
- `encryptionService.decrypt(encryptionService.encrypt('secret'))` returns `'secret'`
- Using a tampered ciphertext throws an error (AES-GCM authentication tag validation)

---

## Epic 3: Auth Module (Placeholder)

**Goal:** Create two authentication guards — `JwtAuthGuard` (for the MCP endpoint) and `ApiKeyGuard` (for the Admin API) — that pass all requests through during development. Provide a clean interface for plugging in the company's internal auth package later.

---

### Task 3.1 — JWT Guard (MCP Endpoint Placeholder)

**Sub-tasks:**

1. **Create `apps/backend/src/auth/guards/jwt.guard.ts`**:
   ```typescript
   import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
   import { Reflector } from '@nestjs/core';
   import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

   @Injectable()
   export class JwtAuthGuard implements CanActivate {
     private readonly logger = new Logger(JwtAuthGuard.name);

     constructor(private reflector: Reflector) {}

     canActivate(context: ExecutionContext): boolean {
       // Allow routes marked @Public() to bypass auth
       const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
         context.getHandler(),
         context.getClass(),
       ]);
       if (isPublic) return true;

       // TODO: Replace this block with your internal JWT validation package
       // Expected header: Authorization: Bearer <token>
       // const request = context.switchToHttp().getRequest();
       // const token = request.headers['authorization']?.split(' ')[1];
       // return this.internalAuthPackage.validateJwt(token);

       this.logger.debug('JwtAuthGuard: pass-through (dev mode) — implement real validation before production');
       return true;
     }
   }
   ```

2. **Create `apps/backend/src/auth/decorators/public.decorator.ts`**:
   ```typescript
   import { SetMetadata } from '@nestjs/common';
   export const IS_PUBLIC_KEY = 'isPublic';
   export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
   ```

---

### Task 3.2 — API Key Guard (Admin API Placeholder)

**Sub-tasks:**

1. **Create `apps/backend/src/auth/guards/api-key.guard.ts`**:
   ```typescript
   import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
   import { ConfigService } from '@nestjs/config';

   @Injectable()
   export class ApiKeyGuard implements CanActivate {
     private readonly logger = new Logger(ApiKeyGuard.name);

     constructor(private config: ConfigService) {}

     canActivate(context: ExecutionContext): boolean {
       // TODO: Replace this block with your internal API key validation package
       // Expected header: X-API-Key: <key>
       // const request = context.switchToHttp().getRequest();
       // const key = request.headers['x-api-key'];
       // return key === this.config.get<string>('auth.adminApiKey');
       //   OR: return this.internalAuthPackage.validateApiKey(key);

       this.logger.debug('ApiKeyGuard: pass-through (dev mode) — implement real validation before production');
       return true;
     }
   }
   ```

---

### Task 3.3 — Auth Module Wiring

**Sub-tasks:**

1. **Create `apps/backend/src/auth/auth.module.ts`**:
   ```typescript
   import { Module } from '@nestjs/common';
   import { JwtAuthGuard } from './guards/jwt.guard';
   import { ApiKeyGuard } from './guards/api-key.guard';

   @Module({
     providers: [JwtAuthGuard, ApiKeyGuard],
     exports: [JwtAuthGuard, ApiKeyGuard],
   })
   export class AuthModule {}
   ```

2. **Import `AuthModule` in `AppModule`**.

3. **Apply guards at the controller level** (not globally, so `/health` and `/metrics` remain public):
   - `GatewayController` → `@UseGuards(JwtAuthGuard)`
   - `ServersController` → `@UseGuards(ApiKeyGuard)`
   - `RequestLogsController` → `@UseGuards(ApiKeyGuard)`

**Acceptance Criteria:**
- With guards active, all requests still return `200` (pass-through behavior)
- Changing `canActivate` to `return false` causes a `403` response (guard is properly wired)
- `@Public()` decorator on a route bypasses `JwtAuthGuard`

---

## Epic 4: Admin CRUD API (Server Management)

**Goal:** Implement a fully documented RESTful API for managing downstream MCP server records. Include full CRUD, Swagger docs, and DTO validation.

---

### Task 4.1 — Swagger / OpenAPI Setup

**Sub-tasks:**

1. **Configure Swagger in `main.ts`**:
   ```typescript
   import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

   const swaggerConfig = new DocumentBuilder()
     .setTitle('MCP Gateway Admin API')
     .setDescription('Manage downstream MCP servers connected to the Gateway')
     .setVersion('1.0')
     .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'AdminApiKey')
     .build();

   const document = SwaggerModule.createDocument(app, swaggerConfig);
   SwaggerModule.setup('api/docs', app, document);
   ```

2. Ensure all DTOs and entity response types are decorated with `@ApiProperty()` and `@ApiPropertyOptional()` decorators.

**Acceptance Criteria:**
- `GET http://localhost:3000/api/docs` returns the Swagger UI
- All Admin API endpoints are visible with request/response schemas

---

### Task 4.2 — MCP Servers CRUD Module

**Description:** Full Create/Read/Update/Delete + enable/disable for `McpServerEntity`.

**Sub-tasks:**

1. **Create `apps/backend/src/servers/dto/create-server.dto.ts`**:
   ```typescript
   import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
   import { IsString, IsUrl, IsOptional, IsEnum, IsArray, IsBoolean, MaxLength, Matches } from 'class-validator';
   import { AuthType } from '../entities/mcp-server.entity';

   export class CreateServerDto {
     @ApiProperty({ example: 'GitHub MCP Server' })
     @IsString() @MaxLength(255)
     name: string;

     @ApiProperty({ example: 'github', description: 'Short alias used as tool prefix. Lowercase letters, numbers, hyphens only.' })
     @IsString() @MaxLength(100)
     @Matches(/^[a-z0-9-]+$/, { message: 'alias must be lowercase alphanumeric with hyphens only' })
     alias: string;

     @ApiProperty({ example: 'http://github-mcp-server:8080' })
     @IsUrl({ require_tld: false })
     url: string;

     @ApiPropertyOptional()
     @IsOptional() @IsString()
     description?: string;

     @ApiPropertyOptional({ type: [String], example: ['github', 'code'] })
     @IsOptional() @IsArray() @IsString({ each: true })
     tags?: string[];

     @ApiPropertyOptional({ enum: AuthType, default: AuthType.NONE })
     @IsOptional() @IsEnum(AuthType)
     authType?: AuthType;

     @ApiPropertyOptional({ description: 'Raw credential string (encrypted at rest). For bearer: the token value. For api_key: the key value.' })
     @IsOptional() @IsString()
     authCredential?: string;

     @ApiPropertyOptional({ default: true })
     @IsOptional() @IsBoolean()
     isEnabled?: boolean;
   }
   ```

2. **Create `apps/backend/src/servers/dto/update-server.dto.ts`**:
   ```typescript
   import { PartialType } from '@nestjs/swagger';
   import { CreateServerDto } from './create-server.dto';
   export class UpdateServerDto extends PartialType(CreateServerDto) {}
   ```

3. **Create `apps/backend/src/servers/servers.service.ts`** with these methods:
   - `findAll(): Promise<ServerResponseDto[]>` — returns all servers with `authCredentialsEncrypted` omitted, replaced by `hasAuthCredential: boolean`
   - `findOne(id: string): Promise<ServerResponseDto>` — throws `NotFoundException` if not found
   - `create(dto: CreateServerDto): Promise<ServerResponseDto>` — encrypts `authCredential` via `EncryptionService` if provided, saves to DB
   - `update(id: string, dto: UpdateServerDto): Promise<ServerResponseDto>` — partial update; re-encrypts credential if provided
   - `remove(id: string): Promise<void>` — throws `NotFoundException` if not found
   - `setEnabled(id: string, enabled: boolean): Promise<ServerResponseDto>` — toggles `isEnabled`
   - `private toResponse(entity: McpServerEntity): ServerResponseDto` — strips `authCredentialsEncrypted`, adds `hasAuthCredential`

   Handle unique alias constraint violations from PostgreSQL: catch `QueryFailedError` with code `'23505'` and rethrow as `ConflictException`.

4. **Create `apps/backend/src/servers/servers.controller.ts`**:
   ```typescript
   @ApiTags('servers')
   @ApiSecurity('AdminApiKey')
   @UseGuards(ApiKeyGuard)
   @Controller('admin/servers')
   export class ServersController {
     @Post()          @ApiOperation({ summary: 'Register a new downstream MCP server' })
     @Get()           @ApiOperation({ summary: 'List all downstream MCP servers' })
     @Get(':id')      @ApiOperation({ summary: 'Get a single MCP server by ID' })
     @Patch(':id')    @ApiOperation({ summary: 'Update a MCP server record' })
     @Delete(':id')   @ApiOperation({ summary: 'Delete a MCP server record' })
     @Patch(':id/enable')   @ApiOperation({ summary: 'Enable a server' })
     @Patch(':id/disable')  @ApiOperation({ summary: 'Disable a server' })
   }
   ```

5. **Create `apps/backend/src/servers/servers.module.ts`**:
   ```typescript
   @Module({
     imports: [TypeOrmModule.forFeature([McpServerEntity]), AuthModule, CommonModule],
     controllers: [ServersController],
     providers: [ServersService],
     exports: [ServersService],
   })
   export class ServersModule {}
   ```

**Acceptance Criteria:**
- `POST /api/admin/servers` with valid body returns `201` with the created server
- `authCredentialsEncrypted` is never present in API responses
- `POST` with duplicate `alias` returns `409 Conflict`
- `GET /api/admin/servers/:id` with non-existent ID returns `404`
- Swagger UI shows all 7 endpoints with schemas

---

## Epic 5: MCP Gateway Core Engine

**Goal:** Implement the heart of the system: registry service (loads servers from DB), health checker (periodic pings), tool aggregator (merges + prefixes tools), MCP proxy (routes tool calls), and the NestJS controller that exposes the MCP SSE endpoint.

---

### Task 5.1 — Server Registry Service

**Description:** An in-memory registry that holds the current list of active downstream MCP servers and their MCP SDK `Client` instances. Refreshes from the DB at a configurable interval.

**Sub-tasks:**

1. **Define type** `ActiveServer` in the registry file:
   ```typescript
   interface ActiveServer {
     entity: McpServerEntity;
     client: Client;  // from @modelcontextprotocol/sdk
   }
   ```

2. **Create `apps/backend/src/gateway/registry/server-registry.service.ts`**:

   ```typescript
   @Injectable()
   export class ServerRegistryService implements OnModuleInit, OnModuleDestroy {
     private readonly logger = new Logger(ServerRegistryService.name);
     private servers: Map<string, ActiveServer> = new Map(); // keyed by alias
     private reloadTimer: NodeJS.Timeout | undefined;

     constructor(
       @InjectRepository(McpServerEntity)
       private serversRepo: Repository<McpServerEntity>,
       private config: ConfigService,
       private encryption: EncryptionService,
     ) {}

     async onModuleInit(): Promise<void> {
       await this.reload();
       this.reloadTimer = setInterval(
         () => this.reload(),
         this.config.get<number>('gateway.reloadIntervalMs'),
       );
     }

     async onModuleDestroy(): Promise<void> {
       if (this.reloadTimer) clearInterval(this.reloadTimer);
       for (const { client } of this.servers.values()) {
         await client.close().catch(() => {});
       }
     }

     async reload(): Promise<void> {
       const dbServers = await this.serversRepo.find({ where: { isEnabled: true } });
       const dbAliases = new Set(dbServers.map(s => s.alias));

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
           const credential = this.encryption.decrypt(entity.authCredentialsEncrypted);
           if (entity.authType === AuthType.BEARER) {
             headers['Authorization'] = `Bearer ${credential}`;
           } else if (entity.authType === AuthType.API_KEY) {
             headers['X-API-Key'] = credential;
           }
         }

         const client = new Client({ name: 'mcp-gateway', version: '1.0.0' });
         const transport = new StreamableHTTPClientTransport(new URL(entity.url), {
           requestInit: { headers },
         });
         await client.connect(transport);
         this.servers.set(entity.alias, { entity, client });
         this.logger.log(`Connected to server: ${entity.alias} (${entity.url})`);
       } catch (err) {
         this.logger.error(`Failed to connect to server ${entity.alias}: ${err}`);
         // Mark as DOWN in DB but do not throw — let other servers proceed
         await this.serversRepo.update(entity.id, {
           status: ServerStatus.DOWN,
           lastCheckedAt: new Date(),
         });
       }
     }

     getActiveServers(): ActiveServer[] {
       return Array.from(this.servers.values()).filter(s => s.entity.status !== ServerStatus.DOWN);
     }

     getServerByAlias(alias: string): ActiveServer | undefined {
       return this.servers.get(alias);
     }
   }
   ```

**Acceptance Criteria:**
- On startup, registry loads all enabled servers and connects MCP clients
- After adding a new server via Admin API, the registry detects it within one `reloadIntervalMs` cycle
- After disabling a server, the next reload disconnects its client

---

### Task 5.2 — Health Checker Service

**Description:** A background service that periodically checks the health of each enabled downstream server.

**Sub-tasks:**

1. **Create `apps/backend/src/gateway/health-checker/health-checker.service.ts`**:

   ```typescript
   @Injectable()
   export class HealthCheckerService implements OnModuleInit, OnModuleDestroy {
     private readonly logger = new Logger(HealthCheckerService.name);
     private checkTimer: NodeJS.Timeout | undefined;

     constructor(
       private registry: ServerRegistryService,
       @InjectRepository(McpServerEntity)
       private serversRepo: Repository<McpServerEntity>,
       private metrics: MetricsService,
       private config: ConfigService,
     ) {}

     onModuleInit(): void {
       this.checkTimer = setInterval(
         () => this.runChecks(),
         this.config.get<number>('gateway.healthCheckIntervalMs'),
       );
     }

     onModuleDestroy(): void {
       if (this.checkTimer) clearInterval(this.checkTimer);
     }

     async runChecks(): Promise<void> {
       const servers = this.registry.getActiveServers();
       const results = await Promise.allSettled(
         servers.map(({ entity, client }) => this.checkServer(entity, client)),
       );

       const upCount = results.filter(r => r.status === 'fulfilled').length;
       this.metrics.activeDownstreamServers.set(upCount);
     }

     private async checkServer(entity: McpServerEntity, client: Client): Promise<void> {
       try {
         await Promise.race([
           client.ping(),
           new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
         ]);
         await this.serversRepo.update(entity.id, { status: ServerStatus.UP, lastCheckedAt: new Date() });
         entity.status = ServerStatus.UP;
       } catch {
         this.logger.warn(`Health check failed for server: ${entity.alias}`);
         await this.serversRepo.update(entity.id, { status: ServerStatus.DOWN, lastCheckedAt: new Date() });
         entity.status = ServerStatus.DOWN;
       }
     }
   }
   ```

2. **Add `GET /api/admin/health` endpoint** in a `GatewayHealthController` (inside `gateway.module.ts`) that returns the current status of all servers from the registry, including `lastCheckedAt`. This is a separate endpoint from the NestJS Terminus `/health` endpoint.

**Acceptance Criteria:**
- After `HEALTH_CHECK_INTERVAL_MS` seconds, `status` column is updated in DB
- An unreachable server shows `status = 'DOWN'` in both DB and the health endpoint response
- `GET /api/admin/health` returns an array of all active servers with their status

---

### Task 5.3 — Tool Aggregator Service

**Description:** Fetches tool lists from all UP servers in the registry and returns a merged, prefixed list for exposing to AI clients.

**Sub-tasks:**

1. **Create `apps/backend/src/gateway/aggregator/tool-aggregator.service.ts`**:

   ```typescript
   interface CacheEntry {
     tools: Tool[];
     expiresAt: number;
   }

   @Injectable()
   export class ToolAggregatorService {
     private readonly logger = new Logger(ToolAggregatorService.name);
     private cache: CacheEntry | null = null;
     private readonly cacheTtlMs = 5000;

     constructor(private registry: ServerRegistryService) {}

     async getAggregatedTools(): Promise<Tool[]> {
       if (this.cache && this.cache.expiresAt > Date.now()) {
         return this.cache.tools;
       }

       const servers = this.registry.getActiveServers();
       const toolArrays = await Promise.allSettled(
         servers.map(async ({ entity, client }) => {
           const { tools } = await client.listTools();
           return tools.map(tool => ({
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
           this.logger.warn(`Failed to list tools from a server: ${result.reason}`);
         }
       }

       this.cache = { tools, expiresAt: Date.now() + this.cacheTtlMs };
       return tools;
     }

     resolveServer(prefixedToolName: string): {
       alias: string;
       originalToolName: string;
       server: ActiveServer;
     } | null {
       const separatorIndex = prefixedToolName.indexOf('__');
       if (separatorIndex === -1) return null;

       const alias = prefixedToolName.slice(0, separatorIndex);
       const originalToolName = prefixedToolName.slice(separatorIndex + 2);
       const server = this.registry.getServerByAlias(alias);

       if (!server) return null;
       return { alias, originalToolName, server };
     }
   }
   ```

**Acceptance Criteria:**
- When two servers both have a tool named `search`, the aggregated list contains `server-a__search` and `server-b__search`
- If one server's `listTools()` call fails, its tools are omitted but other servers' tools still appear
- Cache prevents hammering downstream servers on rapid successive `list_tools` requests

---

### Task 5.4 — MCP Proxy Service

**Description:** Routes a `call_tool` request from the AI client to the correct downstream MCP server based on the tool name prefix.

**Sub-tasks:**

1. **Create `apps/backend/src/gateway/proxy/mcp-proxy.service.ts`**:

   ```typescript
   @Injectable()
   export class McpProxyService {
     private readonly logger = new Logger(McpProxyService.name);

     constructor(
       private aggregator: ToolAggregatorService,
       private requestLogService: RequestLogsService,
       private metrics: MetricsService,
     ) {}

     async callTool(
       prefixedToolName: string,
       args: Record<string, unknown>,
     ): Promise<CallToolResult> {
       const start = Date.now();
       const resolved = this.aggregator.resolveServer(prefixedToolName);

       if (!resolved) {
         throw new NotFoundException(`Tool '${prefixedToolName}' not found in any active server`);
       }

       const { alias, originalToolName, server } = resolved;

       try {
         const result = await server.client.callTool({
           name: originalToolName,
           arguments: args,
         });

         const latencyMs = Date.now() - start;
         this.metrics.requestCounter.inc({ server_alias: alias, tool_name: originalToolName, status: 'success' });
         this.metrics.requestDuration.observe({ server_alias: alias }, latencyMs);

         await this.requestLogService.create({
           toolName: originalToolName,
           serverAlias: alias,
           serverId: server.entity.id,
           latencyMs,
           status: LogStatus.SUCCESS,
         });

         return result;
       } catch (error) {
         const latencyMs = Date.now() - start;
         this.metrics.requestCounter.inc({ server_alias: alias, tool_name: originalToolName, status: 'error' });

         await this.requestLogService.create({
           toolName: originalToolName,
           serverAlias: alias,
           serverId: server.entity.id,
           latencyMs,
           status: LogStatus.ERROR,
           errorMessage: error instanceof Error ? error.message : String(error),
         });

         throw error;
       }
     }
   }
   ```

**Acceptance Criteria:**
- `callTool('github__search', { query: 'test' })` strips the prefix and calls `search` on the GitHub server
- A log record is persisted for every call (success and error)
- An unknown tool name throws `NotFoundException`
- Prometheus counters and histograms are updated on every call

---

### Task 5.5 — MCP Gateway Controller (SSE Endpoint)

**Description:** Create the NestJS controller that exposes the MCP SSE endpoint to AI clients using the `@modelcontextprotocol/sdk` `Server` class with `StreamableHTTPServerTransport`.

**Sub-tasks:**

1. **Create `apps/backend/src/gateway/gateway.controller.ts`**:

   ```typescript
   import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';
   import { Request, Response } from 'express';
   import { randomUUID } from 'crypto';
   import {
     Server,
     ListToolsRequestSchema,
     CallToolRequestSchema,
   } from '@modelcontextprotocol/sdk/server/index.js';
   import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
   import { JwtAuthGuard } from '../auth/guards/jwt.guard';
   import { ToolAggregatorService } from './aggregator/tool-aggregator.service';
   import { McpProxyService } from './proxy/mcp-proxy.service';

   @UseGuards(JwtAuthGuard)
   @Controller('mcp')
   export class GatewayController {
     private readonly mcpServer: Server;

     constructor(
       private aggregator: ToolAggregatorService,
       private proxy: McpProxyService,
     ) {
       this.mcpServer = new Server(
         { name: 'mcp-gateway', version: '1.0.0' },
         { capabilities: { tools: {} } },
       );

       this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
         tools: await this.aggregator.getAggregatedTools(),
       }));

       this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
         return this.proxy.callTool(
           request.params.name,
           (request.params.arguments as Record<string, unknown>) ?? {},
         );
       });
     }

     @All()
     async handleMcp(@Req() req: Request, @Res() res: Response): Promise<void> {
       const transport = new StreamableHTTPServerTransport({
         sessionIdGenerator: () => randomUUID(),
       });
       await this.mcpServer.connect(transport);
       await transport.handleRequest(req, res, req.body);
       res.on('close', () => { transport.close().catch(() => {}); });
     }
   }
   ```

2. **Create `apps/backend/src/gateway/gateway.module.ts`** importing:
   - `TypeOrmModule.forFeature([McpServerEntity])`
   - `AuthModule`, `CommonModule`, `RequestLogsModule`, `MetricsModule`
   - Declaring and exporting: `ServerRegistryService`, `HealthCheckerService`, `ToolAggregatorService`, `McpProxyService`, `GatewayController`, `GatewayHealthController`

3. **Import `GatewayModule` in `AppModule`**.

**Acceptance Criteria:**
- An MCP client using `@modelcontextprotocol/sdk` can connect to `http://localhost:3000/mcp`
- `client.listTools()` returns tools from all connected downstream servers with `alias__` prefixes
- `client.callTool({ name: 'alias__toolname', arguments: {} })` executes on the correct downstream server

---

## Epic 6: Observability Stack

**Goal:** Implement structured logging, HTTP request logging, the `/health` endpoint (NestJS Terminus), Prometheus `/metrics` endpoint, and the request log query API for the Admin UI.

---

### Task 6.1 — Structured Logging with Winston

**Sub-tasks:**

1. **Configure Winston in `main.ts`** using `nest-winston`:
   ```typescript
   import { WinstonModule } from 'nest-winston';
   import * as winston from 'winston';

   const app = await NestFactory.create(AppModule, {
     logger: WinstonModule.createLogger({
       transports: [
         new winston.transports.Console({
           format: winston.format.combine(
             winston.format.timestamp(),
             winston.format.ms(),
             winston.format.json(),
           ),
         }),
       ],
     }),
   });
   ```

2. All services using `new Logger(ServiceName.name)` will automatically use Winston for output.

**Acceptance Criteria:**
- All NestJS framework logs appear as JSON objects with `timestamp`, `level`, `context`, `message`
- Custom `Logger` instances in services produce JSON log lines

---

### Task 6.2 — Request/Response Logging Interceptor

**Sub-tasks:**

1. **Create `apps/backend/src/common/interceptors/logging.interceptor.ts`**:
   ```typescript
   import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
   import { Observable } from 'rxjs';
   import { tap } from 'rxjs/operators';
   import { Request, Response } from 'express';

   @Injectable()
   export class LoggingInterceptor implements NestInterceptor {
     private readonly logger = new Logger('HTTP');

     intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
       const req = context.switchToHttp().getRequest<Request>();
       const { method, url } = req;
       const start = Date.now();

       return next.handle().pipe(
         tap(() => {
           const res = context.switchToHttp().getResponse<Response>();
           this.logger.log({
             method,
             url,
             statusCode: res.statusCode,
             latencyMs: Date.now() - start,
           });
         }),
       );
     }
   }
   ```

2. **Register `LoggingInterceptor` globally** in `app.module.ts`:
   ```typescript
   { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor }
   ```

**Acceptance Criteria:**
- Every HTTP request produces a JSON log line with method, URL, status code, and latency

---

### Task 6.3 — Health Endpoint

**Sub-tasks:**

1. **Create `apps/backend/src/health/health.module.ts`** using `@nestjs/terminus`:
   ```typescript
   import { TerminusModule } from '@nestjs/terminus';
   import { TypeOrmHealthIndicator, HealthCheckService } from '@nestjs/terminus';
   import { Controller, Get } from '@nestjs/common';
   import { Public } from '../auth/decorators/public.decorator';

   @Controller('health')
   class HealthController {
     constructor(
       private health: HealthCheckService,
       private db: TypeOrmHealthIndicator,
     ) {}

     @Get()
     @Public()
     @HealthCheck()
     check() {
       return this.health.check([() => this.db.pingCheck('database')]);
     }
   }

   @Module({
     imports: [TerminusModule],
     controllers: [HealthController],
   })
   export class HealthModule {}
   ```

2. Import `HealthModule` in `AppModule`.

**Acceptance Criteria:**
- `GET /health` returns `{ status: 'ok', info: { database: { status: 'up' } } }` when DB is connected
- Returns `503` when DB is unavailable (Docker healthcheck compatibility)

---

### Task 6.4 — Prometheus Metrics Endpoint

**Sub-tasks:**

1. **Create `apps/backend/src/metrics/metrics.service.ts`**:
   ```typescript
   import { Injectable } from '@nestjs/common';
   import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

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
   ```

2. **Create `apps/backend/src/metrics/metrics.controller.ts`**:
   ```typescript
   @Controller('metrics')
   export class MetricsController {
     constructor(private metrics: MetricsService) {}

     @Get()
     @Public()
     @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
     async metrics(): Promise<string> {
       return this.metrics.getMetrics();
     }
   }
   ```

3. **Create `apps/backend/src/metrics/metrics.module.ts`** declaring and exporting `MetricsService` and `MetricsController`.

4. **Import `MetricsModule`** in `AppModule` and in `GatewayModule`.

**Acceptance Criteria:**
- `GET /metrics` returns valid Prometheus text format
- `mcp_gateway_requests_total` counter increments after routing a tool call
- `mcp_gateway_active_servers` gauge reflects current count of UP servers

---

### Task 6.5 — Request Logs Module & API

**Sub-tasks:**

1. **Create `apps/backend/src/request-logs/dto/query-logs.dto.ts`**:
   ```typescript
   import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
   import { Type } from 'class-transformer';
   import { LogStatus } from '../entities/request-log.entity';

   export class QueryLogsDto {
     @IsOptional() @IsString()
     serverAlias?: string;

     @IsOptional() @IsEnum(LogStatus)
     status?: LogStatus;

     @IsOptional() @IsDateString()
     from?: string;

     @IsOptional() @IsDateString()
     to?: string;

     @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500)
     limit?: number = 100;

     @IsOptional() @Type(() => Number) @IsInt() @Min(0)
     offset?: number = 0;
   }
   ```

2. **Create `apps/backend/src/request-logs/request-logs.service.ts`** with:
   - `create(data: Partial<RequestLogEntity>): Promise<RequestLogEntity>` — simple save
   - `findAll(query: QueryLogsDto): Promise<{ data: RequestLogEntity[]; total: number }>` — uses TypeORM `QueryBuilder` with optional `WHERE` clauses for `serverAlias`, `status`, and date range (`created_at BETWEEN from AND to`); applies `LIMIT`/`OFFSET` for pagination; orders by `created_at DESC`

3. **Create `apps/backend/src/request-logs/request-logs.controller.ts`**:
   ```typescript
   @ApiTags('logs')
   @ApiSecurity('AdminApiKey')
   @UseGuards(ApiKeyGuard)
   @Controller('admin/logs')
   export class RequestLogsController {
     @Get()
     @ApiOperation({ summary: 'Query request logs with optional filters and pagination' })
     findAll(@Query() query: QueryLogsDto) {
       return this.requestLogsService.findAll(query);
     }
   }
   ```

4. **Create `apps/backend/src/request-logs/request-logs.module.ts`** and import it in `AppModule` and `GatewayModule`.

**Acceptance Criteria:**
- `GET /api/admin/logs?serverAlias=github&limit=10` returns 10 most recent GitHub calls
- `GET /api/admin/logs?status=error` returns only failed calls
- Pagination works correctly with `offset` and `limit` query params

---

## Epic 7: Admin Frontend (React + Vite + shadcn/ui)

**Goal:** Build a clean, functional Admin UI with three pages: Server CRUD management, live health dashboard, and request logs viewer.

---

### Task 7.1 — Frontend Project Setup

**Sub-tasks:**

1. **Initialize React + Vite** in `apps/frontend/`:
   ```bash
   cd apps/frontend
   npm create vite@latest . -- --template react-ts
   npm install
   ```

2. **Install Tailwind CSS**:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```
   Configure `tailwind.config.ts`:
   ```typescript
   export default {
     content: ['./index.html', './src/**/*.{ts,tsx}'],
     theme: { extend: {} },
     plugins: [],
   }
   ```
   Add `@tailwind` directives to `src/index.css`.

3. **Initialize shadcn/ui**:
   ```bash
   npx shadcn@latest init
   ```
   Select: TypeScript, Default style, Slate base color, CSS variables enabled.

4. **Install required shadcn/ui components**:
   ```bash
   npx shadcn@latest add button table dialog alert-dialog form input select badge switch card tabs tooltip
   ```

5. **Install React Router and React Query**:
   ```bash
   npm install react-router-dom @tanstack/react-query react-hook-form @hookform/resolvers zod
   ```

6. **Create `apps/frontend/src/lib/api.ts`** — typed fetch wrapper:
   ```typescript
   const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
   const API_KEY = import.meta.env.VITE_ADMIN_API_KEY ?? 'dev-admin-key';

   async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
     const res = await fetch(`${BASE}/api${path}`, {
       headers: {
         'Content-Type': 'application/json',
         'X-API-Key': API_KEY,
         ...options?.headers,
       },
       ...options,
     });
     if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
     if (res.status === 204) return undefined as T;
     return res.json() as Promise<T>;
   }

   export const serversApi = {
     list: () => apiFetch<McpServer[]>('/admin/servers'),
     create: (dto: CreateServerDto) =>
       apiFetch<McpServer>('/admin/servers', { method: 'POST', body: JSON.stringify(dto) }),
     update: (id: string, dto: Partial<CreateServerDto>) =>
       apiFetch<McpServer>(`/admin/servers/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
     remove: (id: string) =>
       apiFetch<void>(`/admin/servers/${id}`, { method: 'DELETE' }),
     enable: (id: string) =>
       apiFetch<McpServer>(`/admin/servers/${id}/enable`, { method: 'PATCH' }),
     disable: (id: string) =>
       apiFetch<McpServer>(`/admin/servers/${id}/disable`, { method: 'PATCH' }),
   };

   export const healthApi = {
     status: () => apiFetch<ServerHealth[]>('/admin/health'),
   };

   export const logsApi = {
     list: (params: Record<string, string | number | undefined>) =>
       apiFetch<{ data: RequestLog[]; total: number }>(
         `/admin/logs?${new URLSearchParams(
           Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])),
         )}`,
       ),
   };
   ```
   Define TypeScript interfaces `McpServer`, `CreateServerDto`, `ServerHealth`, `RequestLog` in a shared `src/lib/types.ts` file that mirrors the backend response shapes.

7. **Create `apps/frontend/src/App.tsx`** with React Router v6 routing:
   ```tsx
   import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   import Layout from './components/Layout';
   import ServersPage from './pages/ServersPage';
   import HealthPage from './pages/HealthPage';
   import LogsPage from './pages/LogsPage';

   const queryClient = new QueryClient();

   export default function App() {
     return (
       <QueryClientProvider client={queryClient}>
         <BrowserRouter>
           <Layout>
             <Routes>
               <Route path="/" element={<Navigate to="/servers" replace />} />
               <Route path="/servers" element={<ServersPage />} />
               <Route path="/health" element={<HealthPage />} />
               <Route path="/logs" element={<LogsPage />} />
             </Routes>
           </Layout>
         </BrowserRouter>
       </QueryClientProvider>
     );
   }
   ```

8. **Create `apps/frontend/src/components/Layout.tsx`** with a top nav bar containing:
   - App title: "MCP Gateway Admin"
   - Navigation links styled as tabs: Servers | Health | Logs (using `react-router-dom`'s `NavLink` with active styling)

**Acceptance Criteria:**
- `npm run dev` starts the Vite dev server at `http://localhost:5173`
- Navigating between `/servers`, `/health`, `/logs` renders different pages without 404

---

### Task 7.2 — Servers CRUD Page

**Description:** Full CRUD interface for managing downstream MCP servers.

**Sub-tasks:**

1. **Create `apps/frontend/src/pages/ServersPage.tsx`**:
   - `useQuery({ queryKey: ['servers'], queryFn: serversApi.list })` to fetch server list
   - shadcn `Table` with columns: **Name**, **Alias**, **URL** (truncated with tooltip), **Status** (colored `Badge`), **Tags** (small badges), **Enabled** (`Switch` component), **Actions** (Edit button, Delete button)
   - Status badge colors: green for `UP`, red for `DOWN`, gray for `UNKNOWN`
   - Enabled `Switch`: on toggle, call `serversApi.enable(id)` or `serversApi.disable(id)`, then invalidate `['servers']` query

2. **Create `ServerFormDialog` component** (reused for Create and Edit):
   - shadcn `Dialog` containing a `Form` (react-hook-form) with zod schema validation
   - Fields: Name (`Input`), Alias (`Input`, disabled on edit), URL (`Input`), Description (`Textarea`), Tags (comma-separated `Input`), Auth Type (`Select`: None / Bearer / API Key), Auth Credential (password `Input`, shown only when authType ≠ 'none')
   - On submit: call `serversApi.create(dto)` or `serversApi.update(id, dto)`, `queryClient.invalidateQueries(['servers'])`, close dialog
   - Show loading state on the submit button during the API call

3. **Create `DeleteServerDialog` component**:
   - shadcn `AlertDialog` with message "Are you sure you want to delete **{server.name}**? This action cannot be undone."
   - On confirm: `serversApi.remove(id)`, `queryClient.invalidateQueries(['servers'])`

4. **"Add Server" button** in the page header opens the `ServerFormDialog` in create mode.

**Acceptance Criteria:**
- Creating a server via the UI persists it and appears in the table
- Editing a server via the Edit button pre-fills the form with current values
- Toggling the Enabled switch immediately reflects the change
- Deleting a server requires confirmation and removes it from the table

---

### Task 7.3 — Health Dashboard Page

**Description:** Real-time health status overview of all downstream servers.

**Sub-tasks:**

1. **Create `apps/frontend/src/pages/HealthPage.tsx`**:
   - `useQuery({ queryKey: ['health'], queryFn: healthApi.status, refetchInterval: 15000 })`
   - Summary bar at the top: "**X** UP | **Y** DOWN | **Z** UNKNOWN"
   - CSS grid of shadcn `Card` components, one per server, each showing:
     - Server `name` (heading)
     - `alias` and `url` (subtext)
     - Status `Badge` (colored: green/red/gray)
     - "Last checked: X minutes ago" (use a relative time formatter, e.g., `Intl.RelativeTimeFormat`)
   - "Last refreshed: HH:MM:SS" label in the top-right corner
   - Manual "Refresh" button that calls `queryClient.invalidateQueries(['health'])`

**Acceptance Criteria:**
- Page auto-refreshes every 15 seconds
- Card badges correctly reflect the current `status`
- Manual refresh button immediately re-fetches data

---

### Task 7.4 — Request Logs Viewer Page

**Description:** Filterable, paginated table of recent tool call logs.

**Sub-tasks:**

1. **Create `apps/frontend/src/pages/LogsPage.tsx`**:
   - Filter controls at top (as a card/bar):
     - Server Alias: `Select` (options populated from `serversApi.list()`)
     - Status: `Select` (All / Success / Error)
     - Date From / Date To: `<input type="datetime-local" />`
     - "Clear filters" button that resets all filters
   - `useQuery({ queryKey: ['logs', filters, page], queryFn: () => logsApi.list({...filters, offset: page*limit, limit}) })`
   - shadcn `Table` with columns: **Timestamp**, **Tool Name**, **Server**, **Status** (Badge), **Latency** (ms), **Error** (truncated text, full text in shadcn `Tooltip` on hover)
   - Pagination bar: Previous / Next buttons + "Showing X–Y of Z results" text
   - **"Live" toggle button**: when active, sets `refetchInterval: 5000`; shows a pulsing green dot indicator

**Acceptance Criteria:**
- Filtering by server alias shows only that server's logs
- Filtering by status=error shows only failed calls
- Pagination correctly fetches the next set of results
- Live mode auto-refreshes every 5 seconds when toggled on

---

## Epic 8: Testing

**Goal:** Establish a robust test suite covering backend services with unit tests and key API flows with integration tests.

---

### Task 8.1 — Backend Unit Tests

**Description:** Write Jest unit tests for all core services, mocking all external dependencies.

**Sub-tasks:**

1. **`servers/servers.service.spec.ts`** — Tests for `ServersService`:
   - Create a `TestingModule` with `ServersService`, mock `Repository<McpServerEntity>` via `{ provide: getRepositoryToken(McpServerEntity), useValue: mockRepo }`, mock `EncryptionService`
   - Test: `create()` calls `encryptionService.encrypt()` when `authCredential` is provided
   - Test: `findAll()` calls `toResponse()` which omits `authCredentialsEncrypted`
   - Test: `findOne('nonexistent-id')` throws `NotFoundException`
   - Test: `remove('nonexistent-id')` throws `NotFoundException`
   - Test: duplicate `alias` on `create()` causes `ConflictException` (simulate `QueryFailedError` with code `'23505'`)

2. **`gateway/aggregator/tool-aggregator.service.spec.ts`** — Tests for `ToolAggregatorService`:
   - Mock `ServerRegistryService.getActiveServers()` to return two fake `ActiveServer` objects (aliases: `svc-a`, `svc-b`)
   - Mock `client.listTools()` on each to return `[{ name: 'search', description: 'Search', inputSchema: {} }]`
   - Test: `getAggregatedTools()` returns tools with names `svc-a__search` and `svc-b__search`
   - Test: if `svc-b.client.listTools()` throws, result still contains `svc-a__search` (partial failure tolerance)
   - Test: `resolveServer('github__search')` returns `{ alias: 'github', originalToolName: 'search', server: ... }`
   - Test: `resolveServer('no-separator')` returns `null`

3. **`gateway/proxy/mcp-proxy.service.spec.ts`** — Tests for `McpProxyService`:
   - Mock `ToolAggregatorService.resolveServer()`
   - Mock `server.client.callTool()`
   - Mock `RequestLogsService.create()`
   - Mock `MetricsService` (spy on `requestCounter.inc`, `requestDuration.observe`)
   - Test: on success, `callTool` returns the downstream result and calls `requestLogService.create` with `status: 'success'`
   - Test: on downstream failure, error is rethrown and `requestLogService.create` is called with `status: 'error'`
   - Test: unknown tool name (resolveServer returns null) throws `NotFoundException`

4. **`common/encryption/encryption.service.spec.ts`**:
   - Provide a valid 64-char hex `ENCRYPTION_KEY` in the test module config
   - Test: `encrypt()` + `decrypt()` round-trips successfully
   - Test: tampered ciphertext (flip one hex char) throws during `decrypt()`

**Acceptance Criteria:**
- `npm run test` passes all unit tests
- `npm run test:cov` shows ≥70% line coverage for `src/servers/`, `src/gateway/`, and `src/common/`

---

### Task 8.2 — Backend Integration Tests (E2E)

**Description:** Integration tests that spin up a real NestJS application connected to a test PostgreSQL database.

**Sub-tasks:**

1. **Configure `apps/backend/test/jest-e2e.json`**:
   ```json
   {
     "moduleFileExtensions": ["js", "json", "ts"],
     "rootDir": ".",
     "testEnvironment": "node",
     "testRegex": ".e2e-spec.ts$",
     "transform": { "^.+\\.(t|j)s$": "ts-jest" }
   }
   ```

2. **Create `apps/backend/test/servers.e2e-spec.ts`**:
   Use `@nestjs/testing` `createTestingModule` and `Test.createTestingModule` with the full `AppModule`. Before each test, connect to a separate `DATABASE_NAME=mcp_gateway_test` DB (set via environment). Use `supertest` for HTTP assertions.

   Tests to implement:
   - `POST /api/admin/servers` with valid body → HTTP `201`, response body has `id`, `name`, `alias`
   - `GET /api/admin/servers` → HTTP `200`, array contains the created server
   - `GET /api/admin/servers/:id` → HTTP `200`, returns correct server
   - `PATCH /api/admin/servers/:id` with `{ name: 'Updated Name' }` → HTTP `200`, `name` is updated
   - `DELETE /api/admin/servers/:id` → HTTP `200`; subsequent `GET /api/admin/servers/:id` → HTTP `404`
   - `POST /api/admin/servers` with same `alias` as existing server → HTTP `409`
   - `GET /api/admin/servers/:nonexistent-uuid` → HTTP `404`

3. **Add migration scripts** to `package.json`:
   ```json
   "pretest:e2e": "cross-env DATABASE_NAME=mcp_gateway_test npm run migration:run",
   "posttest:e2e": "cross-env DATABASE_NAME=mcp_gateway_test npm run typeorm -- schema:drop -d src/data-source.ts"
   ```
   Install `cross-env` as a dev dependency for cross-platform env var setting.

**Acceptance Criteria:**
- `npm run test:e2e` passes all integration tests
- Tests run against a real PostgreSQL instance
- Database is clean before each test run

---

## Epic 9: Final Polish & Documentation

**Goal:** Write the developer README, ensure the docker-compose fully works end-to-end, and verify all integration points.

---

### Task 9.1 — README.md

**Description:** Write a comprehensive `README.md` at the repo root.

**Required sections:**

1. **Project Overview** — What is the MCP Gateway and why it exists
2. **Architecture Diagram** — ASCII diagram: `AI Client → Gateway → [Server A] [Server B] [Server C]`
3. **Quick Start (Docker)**:
   ```bash
   git clone <repo-url>
   cd mcp-gatwey
   cp .env.example .env
   # Edit .env — set DATABASE_PASSWORD, JWT_SECRET, ADMIN_API_KEY, ENCRYPTION_KEY
   docker compose up --build
   ```
   Access points:
   - Backend API: `http://localhost:3000`
   - API Docs (Swagger): `http://localhost:3000/api/docs`
   - MCP Endpoint: `http://localhost:3000/mcp`
   - Admin UI: `http://localhost:80`
   - Health: `http://localhost:3000/health`
   - Metrics: `http://localhost:3000/metrics`

4. **Environment Variables** — Markdown table of all variables with descriptions and example values

5. **Auth Integration Guide** — Step-by-step guide for replacing the pass-through guards:
   - For `JwtAuthGuard`: install internal package, inject it, replace the `// TODO` block
   - For `ApiKeyGuard`: same process
   - Note: guards are located at `apps/backend/src/auth/guards/`

6. **Development (without Docker)**:
   ```bash
   # Terminal 1: start PostgreSQL
   docker compose up postgres -d

   # Terminal 2: backend
   cd apps/backend
   npm install && npm run start:dev

   # Terminal 3: frontend
   cd apps/frontend
   npm install && npm run dev
   ```

7. **Adding a Downstream MCP Server (via curl)**:
   ```bash
   curl -X POST http://localhost:3000/api/admin/servers \
     -H 'Content-Type: application/json' \
     -H 'X-API-Key: <your-admin-api-key>' \
     -d '{"name":"My Server","alias":"myserver","url":"http://my-mcp-server:8080"}'
   ```

**Acceptance Criteria:**
- All environment variables are documented
- Quick Start works on a fresh machine with Docker installed
- Auth integration guide is clear enough for a developer unfamiliar with the codebase

---

### Task 9.2 — End-to-End Docker Compose Verification

**Description:** Verify the complete system works end-to-end via `docker compose up --build`.

**Sub-tasks:**

1. **Verify startup sequence**: `postgres` (healthy) → `backend` (migrations run automatically) → `frontend` (serves static build via `serve`)

2. **Smoke test checklist** — run these after `docker compose up --build -d`:

   | Command | Expected Result |
   |---|---|
   | `curl http://localhost:3000/health` | `{"status":"ok",...}` |
   | `curl http://localhost:3000/metrics` | Prometheus text format |
   | `curl http://localhost:3000/api/docs` | Swagger HTML page |
   | `curl http://localhost:80` | React app HTML |
   | `curl -X POST http://localhost:3000/api/admin/servers -H 'Content-Type: application/json' -d '{"name":"Test","alias":"test","url":"http://example.com"}'` | `HTTP 201` |
   | `curl http://localhost:3000/api/admin/logs` | `{"data":[],"total":0}` |

3. **Verify no secrets are baked into images**: Run `docker inspect mcp-gatwey-backend-1` and confirm env vars are not hardcoded (they come from `.env` at runtime).

**Acceptance Criteria:**
- `docker compose up --build` starts all 3 services without errors
- All smoke test commands return expected responses
- Admin UI loads at `http://localhost:80` and can create/list servers

---

## Verification & Testing Guide

After the full implementation is complete, verify the system in this sequence:

### 1. Unit Tests
```bash
cd apps/backend
npm run test
npm run test:cov  # Check for ≥70% coverage
```

### 2. Integration Tests
```bash
cd apps/backend
npm run test:e2e
```

### 3. Docker Compose Smoke Test
```bash
# From repo root
cp .env.example .env
# Edit .env with appropriate values

docker compose up --build -d
docker compose logs -f backend   # Wait for "Application is running on: http://[::1]:3000"

# Run smoke tests
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/admin/servers \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: dev-admin-key' \
  -d '{"name":"Test MCP","alias":"test","url":"http://example.com","isEnabled":true}' | jq
curl http://localhost:3000/api/admin/servers -H 'X-API-Key: dev-admin-key' | jq
```

### 4. MCP Client Integration Test
Connect a real MCP client to verify tool aggregation works end-to-end:
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Client({ name: 'test-client', version: '1.0.0' });
await client.connect(
  new StreamableHTTPClientTransport(new URL('http://localhost:3000/mcp'))
);

const { tools } = await client.listTools();
console.log('Aggregated tools:', tools.map(t => t.name));
// Expected: ['alias__toolname', 'alias2__anothertool', ...]

await client.close();
```

---

## Implementation Order (Recommended)

Execute Epics in this sequence for the smoothest development experience:

```
Epic 1 → Epic 2 → Epic 3 → Epic 4 → Epic 5 → Epic 6 → Epic 7 → Epic 8 → Epic 9
```

Within **Epic 5**, implement services in this dependency order:
```
MetricsModule (no deps)
  → ServerRegistryService (needs McpServerEntity, EncryptionService)
    → HealthCheckerService (needs Registry, MetricsService)
    → ToolAggregatorService (needs Registry)
      → McpProxyService (needs Aggregator, RequestLogsService, MetricsService)
        → GatewayController (needs Aggregator, Proxy)
```

This order ensures each service has its dependencies fully implemented before it is built.
