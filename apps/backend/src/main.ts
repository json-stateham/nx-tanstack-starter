import 'reflect-metadata';

import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });
  app.use(cookieParser());
  app.enableCors({
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3001',
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
};

bootstrap();
