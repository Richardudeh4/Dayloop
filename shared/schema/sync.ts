import { z } from 'zod';

/** Sync wire format (spec 3.6, 7.9). */

export const SyncedTable = z.enum(['items', 'item_exceptions', 'alerts', 'routines', 'nfc_tags']);

export const Change = z.object({
  changeId: z.uuid(), // idempotency key
  deviceCounter: z.number().int().nonnegative(), // ordering without trusting device clocks
  table: SyncedTable,
  rowId: z.uuid(),
  op: z.enum(['upsert', 'delete']),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const BackupAlert = z.object({
  alertKey: z.string().min(1),
  itemId: z.uuid(),
  fireAt: z.iso.datetime({ offset: true }),
  title: z.string(),
  meetingUrl: z.string().optional(),
});

export const PushRequest = z.object({
  deviceId: z.uuid(),
  changes: z.array(Change).max(500),
  backups: z.array(BackupAlert).max(64).default([]),
});

export const PullRequest = z.object({
  since: z.number().int().nonnegative().default(0),
  limit: z.number().int().min(1).max(1000).default(500),
});

export type Change = z.infer<typeof Change>;
