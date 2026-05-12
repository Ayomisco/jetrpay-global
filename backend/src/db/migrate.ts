import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '@/db';
import { logger } from '@/utils/logger';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  // Resolves correctly both from src/ (tsx) and dist/ (node)
  const migrationsFolder = path.resolve(__dirname, '../../migrations');
  logger.info({ message: 'Running DB migrations', migrationsFolder });
  await migrate(db, { migrationsFolder });
  logger.info('Migrations complete');
}

// Allow running directly: tsx src/db/migrate.ts
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
