import { db } from '@/db';
import { users, wallets, devices } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cryptoService } from '@/utils/crypto';
import { logger } from '@/utils/logger';

const TEST_USERS = [
  {
    email: 'test1@jetpay.io',
    firstName: 'Alice',
    lastName: 'Johnson',
    password: 'TestPass123!@#'
  },
  {
    email: 'test2@jetpay.io',
    firstName: 'Bob',
    lastName: 'Smith',
    password: 'TestPass123!@#'
  },
  {
    email: 'test3@jetpay.io',
    firstName: 'Charlie',
    lastName: 'Brown',
    password: 'TestPass123!@#'
  }
];

async function seed() {
  try {
    logger.info('🌱 Starting database seed...');

    // Create test users
    for (const testUser of TEST_USERS) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, testUser.email))
        .limit(1);

      if (existingUser.length > 0) {
        logger.info(`User ${testUser.email} already exists, skipping...`);
        continue;
      }

      const passwordHash = await cryptoService.hashPassword(testUser.password);

      const newUser = await db
        .insert(users)
        .values({
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          passwordHash,
          role: 'user',
          status: 'active',
          kycStatus: 'not_started',
          kycTier: 'tier_0',
          emailVerified: true,
          phoneVerified: false
        })
        .returning();

      const userId = newUser[0].id;

      logger.info(`✅ Created user: ${testUser.email}`);

      // Create test wallets for each currency
      const currencies = ['USD', 'NGN', 'GBP'];
      for (const currency of currencies) {
        await db.insert(wallets).values({
          userId,
          currency: currency as any,
          balance: 100000, // 1000 in smallest unit (cents/kobo)
          availableBalance: 100000,
          reservedBalance: 0,
          status: 'active'
        });
      }

      logger.info(`✅ Created wallets for ${testUser.email}`);

      // Create test device
      const deviceFingerprint = cryptoService.generateDeviceFingerprint('Mozilla/5.0');
      await db.insert(devices).values({
        userId,
        fingerprint: deviceFingerprint,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        ipAddress: '127.0.0.1',
        deviceName: 'Test Device',
        isVerified: true
      });

      logger.info(`✅ Created device for ${testUser.email}`);
    }

    logger.info('✅ Database seed completed!');
    logger.info('\n📋 Test Credentials:');
    TEST_USERS.forEach(user => {
      logger.info(`   Email: ${user.email}`);
      logger.info(`   Password: ${user.password}\n`);
    });
  } catch (error) {
    logger.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
