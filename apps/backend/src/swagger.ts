import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const createSwaggerDocument = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('Admin API')
    .setVersion('1.0')
    .addCookieAuth('access_token')
    .build();

  return SwaggerModule.createDocument(app, config);
};
