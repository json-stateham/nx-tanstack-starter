import { Generator, getConfig } from '../node_modules/@tanstack/router-generator/dist/esm/index.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'admin');
const config = await getConfig({}, root);
await new Generator({ config, root }).run();
console.log('Route tree regenerated.');
