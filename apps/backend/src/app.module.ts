import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import * as Joi from 'joi';
import configuration from './common/config/configuration.js';
import { McpServerEntity } from './servers/entities/mcp-server.entity.js';
import { RequestLogEntity } from './request-logs/entities/request-log.entity.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './auth/auth.module.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      load: [configuration],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
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
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        database: config.get<string>('database.name'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        entities: [McpServerEntity, RequestLogEntity],
        migrations: ['dist/migrations/*.js'],
        migrationsRun: true,
        synchronize: false,
        logging: config.get<string>('nodeEnv') === 'development',
      }),
    }),
    CommonModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
