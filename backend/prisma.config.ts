import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'src/database/schema.prisma',
  migrations: { path: 'src/database/migrations' },
  datasource: {
    url: env('DATABASE_URL'),
    // Needed only where `migrate dev` cannot create a temporary database itself,
    // e.g. `prisma dev` (its shadow server runs on the next port).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
