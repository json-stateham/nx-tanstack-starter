// Runs against the compiled backend (dist/apps/backend) — the plain tsx/esbuild
// runtime doesn't emit the decorator metadata Nest needs for constructor DI,
// so this must run post-build, not against TS sources directly.
require('reflect-metadata');

const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { NestFactory } = require('@nestjs/core');
const { VersioningType } = require('@nestjs/common');

const { AppModule } = require('../../../dist/apps/backend/src/app.module.js');
const { createSwaggerDocument } = require('../../../dist/apps/backend/src/swagger.js');

const run = async () => {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });

  const document = createSwaggerDocument(app);
  writeFileSync(resolve(__dirname, '../openapi.json'), JSON.stringify(document, null, 2));

  await app.close();
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
