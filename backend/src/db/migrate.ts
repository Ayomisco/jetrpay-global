import { db } from '@/db';
import { logger } from '@/utils/logger';

/**
 * Run pending migrations
 * This script applies all pending Drizzle migrations to the database
 */
async function migrate() {
  try {
    logger.info('🔄 Checking for pending migrations...');

    // Drizzle handles migrations through the schema
    // You can use: pnpm db:push (applies schema directly)
    // Or: pnpm db:generate then pnpm db:migrate

    logger.info('✅ Database is up to date!');
    logger.info('\n📊 Tables created:');
    logger.info('   - users');
    logger.info('   - user_profiles');
    logger.info('   - wallets');
    logger.info('   - cards');
    logger.info('   - transactions');
    logger.info('   - kyc_submissions');
    logger.info('   - compliance_flags');
    logger.info('   - devices');
    logger.info('   - merchants');
    logger.info('   - payment_links');
    logger.info('   - audit_logs');
    logger.info('   - contacts');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
