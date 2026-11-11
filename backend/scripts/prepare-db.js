import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
const databaseUrl = process.env.DATABASE_URL || '';

console.log('--- Preparing Database Configuration ---');
console.log(`Target DATABASE_URL prefix: ${databaseUrl.split(':')[0] || 'unknown'}`);

if (!fs.existsSync(schemaPath)) {
  console.error(`schema.prisma not found at ${schemaPath}`);
  process.exit(1);
}

let schemaContent = fs.readFileSync(schemaPath, 'utf-8');

const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

const datasourceMatch = schemaContent.match(/datasource\s+db\s*{[\s\S]*?provider\s*=\s*"([^"]+)"/);
const currentProvider = datasourceMatch ? datasourceMatch[1] : '';

console.log(`Current schema provider: ${currentProvider} -> Target provider: ${targetProvider}`);

if (currentProvider !== targetProvider) {
  schemaContent = schemaContent.replace(
    /datasource db {\s*provider\s*=\s*"[^"]+"/m,
    `datasource db {\n  provider = "${targetProvider}"`
  );
  fs.writeFileSync(schemaPath, schemaContent, 'utf-8');
  console.log(`Updated schema.prisma provider to "${targetProvider}".`);
} else {
  console.log(`schema.prisma already configured for "${targetProvider}".`);
}
