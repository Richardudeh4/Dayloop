import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from './client';
import { lists, type List } from './schema';

/**
 * Everything the app does with lists goes through this file. Screens never
 * write SQL or Drizzle queries themselves; they call these functions.
 */

export type CreateListResult =
  | { ok: true; list: List }
  | { ok: false; reason: 'empty' | 'too_long' | 'duplicate' };

/**
 * INSERT a new list.
 *
 * SQL equivalent:
 *   insert into lists (name, color) values ('Work', '#0F766E');
 */
export async function createList(input: { name: string; color?: string }): Promise<CreateListResult> {
  // 1. Check in the app first, so the user gets a friendly message.
  //    (The database checks again; this is just the polite version.)
  const name = input.name.trim();
  if (name.length === 0) return { ok: false, reason: 'empty' };
  if (name.length > 60) return { ok: false, reason: 'too_long' };

  // 2. "Work" and "work" are the same list to a person. The database rule is
  //    case-sensitive, so check case-insensitively here.
  const sameName = sql`lower(${lists.name}) = lower(${name})`;
  const [live] = await db.select({ id: lists.id }).from(lists).where(and(sameName, isNull(lists.deletedAt)));
  if (live) return { ok: false, reason: 'duplicate' };

  // 3. A list with this name may exist but be soft-deleted (deleted_at set).
  //    The unique rule still counts it, so bring it back instead of inserting.
  const [deleted] = await db.select().from(lists).where(and(sameName, isNotNull(lists.deletedAt)));
  if (deleted) {
    const [revived] = await db
      .update(lists)
      .set({ name, deletedAt: null, color: input.color ?? deleted.color, updatedAt: new Date() })
      .where(eq(lists.id, deleted.id))
      .returning();
    return { ok: true, list: revived };
  }

  // 4. The insert itself. id, position, created_at and updated_at use their
  //    defaults, exactly like your SQL insert in Studio.
  try {
    const [list] = await db.insert(lists).values({ name, color: input.color }).returning();
    return { ok: true, list };
  } catch (e) {
    // 5. The database said no (e.g. two taps raced each other). Turn its error into something the screen can show.
    if (isUniqueViolation(e)) return { ok: false, reason: 'duplicate' };
    throw e; // anything else is a real bug: let it surface
  }
}

/**
 * Soft delete: mark the row as deleted instead of removing it, so sync can
 * tell other devices. Items in the list are kept.
 *
 * SQL equivalent:
 *   update lists set deleted_at = now(), updated_at = now() where id = '...';
 */
export async function deleteList(id: string) {
  const now = new Date();
  await db.update(lists).set({ deletedAt: now, updatedAt: now }).where(eq(lists.id, id));
}

/** Undo a soft delete. */
export async function restoreList(id: string) {
  await db.update(lists).set({ deletedAt: null, updatedAt: new Date() }).where(eq(lists.id, id));
}

/**
 * All live lists, in display order. The screen re-renders automatically
 * whenever the lists table changes.
 *
 * SQL equivalent:
 *   select * from lists where deleted_at is null order by position, created_at;
 */
export function useLists() {
  const { data, updatedAt } = useLiveQuery(
    db.select().from(lists).where(isNull(lists.deletedAt)).orderBy(asc(lists.position), asc(lists.createdAt)),
  );
  // updatedAt stays undefined until the first read finishes, so screens can
  // tell "still loading" apart from "no lists" and avoid flashing the empty state.
  return { lists: data, loaded: updatedAt !== undefined };
}

// SQLite reports a broken unique rule as "UNIQUE constraint failed: lists.name".
// Drizzle may wrap the original error, so check the cause too.
function isUniqueViolation(e: unknown): boolean {
  for (let err = e; err instanceof Error; err = err.cause) {
    if (err.message.includes('UNIQUE constraint failed')) return true;
  }
  return false;
}
