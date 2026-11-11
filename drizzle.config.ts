import { defineConfig } from 'drizzle-kit';

// On-device SQLite schema. `npx drizzle-kit generate` writes migrations to src/db/migrations.
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
});
