import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import { db } from './client';
import migrations from './migrations/migrations';

/**
 * Applies pending on-device migrations (src/db/migrations, made by
 * `npx drizzle-kit generate`). Same idea as `supabase migration up`, but on
 * the phone, every launch. Already-applied migrations are skipped.
 */
export function useDatabase() {
  const { success, error } = useMigrations(db, migrations);
  return { ready: success || !!error, error };
}
