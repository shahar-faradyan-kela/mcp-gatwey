import { DataSource } from 'typeorm';
import { McpServerEntity } from './servers/entities/mcp-server.entity.js';
import { RequestLogEntity } from './request-logs/entities/request-log.entity.js';
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
