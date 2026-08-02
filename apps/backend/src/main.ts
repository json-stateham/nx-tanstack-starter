import 'reflect-metadata';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import type { AppConfig } from './config/app.config';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { createSwaggerDocument } from './swagger';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<AppConfig>>(ConfigService);

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow('FRONTEND_URL'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter(), new ThrottlerExceptionFilter());

  SwaggerModule.setup('api/docs', app, createSwaggerDocument(app));

  const port = config.getOrThrow('PORT');
  await app.listen(port);
};

bootstrap();
