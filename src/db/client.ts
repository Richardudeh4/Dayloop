import { drizzle } from 'drizzle-orm/expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

// schema.ts generates ids with crypto.randomUUID(); make sure it exists on
// every platform the app runs on.
const g = globalThis as { crypto?: { randomUUID?: () => string } };
if (!g.crypto?.randomUUID) {
  g.crypto = Object.assign(g.crypto ?? {}, { randomUUID });
}

// enableChangeListener lets useLiveQuery re-render screens when rows change.
const sqlite = openDatabaseSync('kairo.db', { enableChangeListener: true });

// SQLite ignores foreign keys (e.g. items.list_id → lists.id, on delete set
// null) unless this is switched on for each connection.
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
