import { z } from 'zod';
import { Routine } from './routine.ts';

/** What the AI may return (spec 4.5). It is only ever a draft; the user confirms. */

export const DraftItem = z.object({
  type: z.enum(['event', 'task', 'reminder']),
  title: z.string().min(1).max(500),
  startLocal: z.iso.datetime({ local: true }).optional(),
  endLocal: z.iso.datetime({ local: true }).optional(),
  tz: z.string().nullable().optional(),
  meetingUrl: z.url({ protocol: /^https?$/ }).optional(),
  alertOffsetsMinutes: z.array(z.number().int().min(0)).default([5, 0]),
});

export const AiDraft = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('draft'),
    items: z.array(DraftItem).max(20),
    routines: z.array(Routine.omit({ id: true })).max(5),
  }),
  z.object({ kind: z.literal('question'), question: z.string() }),
  z.object({ kind: z.literal('unsupported'), reason: z.string(), suggestion: z.string().optional() }),
]);

export const AiDraftRequest = z.object({
  text: z.string().min(1).max(2000),
  now: z.iso.datetime({ offset: true }),
  tz: z.string(),
  routineNames: z.array(z.string()).max(100).default([]),
});

export type AiDraft = z.infer<typeof AiDraft>;
export type AiDraftInput = z.infer<typeof AiDraftRequest>;
