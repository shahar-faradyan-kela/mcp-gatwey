import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module.js';

async function bootstrap() {
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

  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({ origin: config.get<string[]>('corsOrigins') });

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'mcp', method: RequestMethod.ALL }],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('MCP Gateway Admin API')
    .setDescription('Manage downstream MCP servers connected to the Gateway')
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', name: 'X-API-Key', in: 'header' },
      'AdminApiKey',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}
bootstrap();
