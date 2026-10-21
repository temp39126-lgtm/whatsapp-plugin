import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ensureAdminUserFromEnv } from '../services/auth/authService';

async function main() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    logger.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in the environment.');
    process.exit(1);
  }

  await connectDatabase();
  await ensureAdminUserFromEnv(env.DEFAULT_TENANT_ID);
  await disconnectDatabase();
  logger.info('Admin upsert complete.');
}

main().catch((error) => {
  logger.error({ error }, 'Admin upsert failed');
  process.exit(1);
});
