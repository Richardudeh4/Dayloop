import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

/**
 * On-device database. Same ideas as backend/supabase/migrations, but SQLite:
 *
 *   Postgres            SQLite (here)
 *   uuid             →  text, id made on the phone with crypto.randomUUID()
 *   boolean          →  integer({ mode: 'boolean' })   (0 / 1)
 *   timestamptz      →  integer({ mode: 'timestamp_ms' }) (milliseconds since 1970, UTC)
 *   timestamp        →  text  ('2026-11-10T15:00', the user's wall-clock time)
 *   default now()    →  .$defaultFn(() => new Date())
 *
 * No user_id: everything in this file belongs to whoever owns the phone, and
 * the app works without an account. The server adds user_id when syncing.
 */

// Shared columns every synced table has.
// crypto.randomUUID is provided in the app by ./client.ts (from expo-crypto).
// Not imported here because drizzle-kit loads this file in plain Node.
const id = () => text('id').primaryKey().$defaultFn(() => crypto.randomUUID());
const timestamps = () => ({
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// lists: mirrors the server's lists table, minus user_id.
// ---------------------------------------------------------------------------

export const lists = sqliteTable(
  'lists',
  {
    id: id(),
    name: text('name').notNull(),
    color: text('color'),
    position: integer('position').notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    // Server: unique (user_id, name). The phone has one owner, so name alone.
    unique('lists_name_unique').on(t.name),
    check('lists_name_length', sql`length(${t.name}) between 1 and 60`),
  ],
);

export type List = typeof lists.$inferSelect;
export type NewList = typeof lists.$inferInsert;

// ---------------------------------------------------------------------------
// Worked example: items. Compare it line by line with the items table in
// backend/supabase/migrations/20261109000000_init_schema.sql.
// ---------------------------------------------------------------------------

export const items = sqliteTable(
  'items',
  {
    id: id(),
    type: text('type', { enum: ['event', 'task', 'reminder'] }).notNull(),
    title: text('title').notNull(),
    notes: text('notes'),
    startLocal: text('start_local'),
    endLocal: text('end_local'),
    tz: text('tz'), // null = floating: follows the phone's time zone
    allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
    rrule: text('rrule'),
    location: text('location'),
    meetingUrl: text('meeting_url'),
    meetingProvider: text('meeting_provider'),
    color: text('color'),
    listId: text('list_id').references(() => lists.id, { onDelete: 'set null' }),
    source: text('source', { enum: ['manual', 'calendar', 'ai', 'share'] }).notNull().default('manual'),
    externalId: text('external_id'),
    version: integer('version').notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    check('items_type_check', sql`${t.type} in ('event', 'task', 'reminder')`),
    check('items_title_length', sql`length(${t.title}) between 1 and 500`),
    check('items_end_after_start', sql`${t.endLocal} is null or ${t.startLocal} is null or ${t.endLocal} >= ${t.startLocal}`),
    check('items_meeting_url_scheme', sql`${t.meetingUrl} is null or lower(${t.meetingUrl}) like 'http://%' or lower(${t.meetingUrl}) like 'https://%'`),
  ],
);

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
