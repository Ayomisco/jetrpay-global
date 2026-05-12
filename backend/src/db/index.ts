import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { logger } from '@/utils/logger';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

/**
 * Create PostgreSQL connection
 */
const client = postgres(DATABASE_URL, {
  max: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
  onnotice: (notice) => {
    if (notice.severity !== 'NOTICE') {
      logger.warn('PostgreSQL Notice:', notice);
    }
  }
});

/**
 * Initialize Drizzle ORM
 */
export const db = drizzle(client);

/**
 * Test database connection
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    await client`SELECT 1`;
    logger.info('✓ Database connection successful');
    return true;
  } catch (error) {
    logger.error('✗ Database connection failed:', error);
    return false;
  }
};

/**
 * Close database connection
 */
export const closeConnection = async (): Promise<void> => {
  try {
    await client.end();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

export default db;
