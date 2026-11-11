import { z } from 'zod';

/** Routine trigger, conditions and actions (spec 3.3). Shared by app and backend. */

export const Trigger = z.discriminatedUnion('type', [
  z.object({ type: z.literal('time'), at: z.string().regex(/^\d{2}:\d{2}$/), rrule: z.string().optional() }),
  z.object({ type: z.literal('calendar'), edge: z.enum(['start', 'end']), offsetMinutes: z.number().int().default(0) }),
  z.object({ type: z.literal('manual') }),
]);

export const Condition = z.discriminatedUnion('type', [
  z.object({ type: z.literal('dayOfWeek'), days: z.array(z.number().int().min(0).max(6)).min(1) }),
  z.object({ type: z.literal('timeWindow'), from: z.string(), to: z.string() }),
  z.object({ type: z.literal('hasCalendarEvent') }),
]);

export const Action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('openLink'), url: z.url({ protocol: /^https?$/ }) }),
  z.object({ type: z.literal('openApp'), app: z.string().min(1) }),
  z.object({ type: z.literal('navigate'), destination: z.string().min(1) }),
  z.object({ type: z.literal('call'), phone: z.string().min(3) }),
  z.object({ type: z.literal('message'), via: z.enum(['whatsapp', 'sms']), to: z.string(), text: z.string() }),
  z.object({ type: z.literal('checklist'), items: z.array(z.string()).min(1) }),
  z.object({ type: z.literal('focusTimer'), minutes: z.number().int().min(1).max(480) }),
  z.object({ type: z.literal('notify'), title: z.string(), body: z.string().optional() }),
]);

export const Routine = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(120),
  trigger: Trigger,
  conditions: z.array(Condition).default([]),
  actions: z.array(Action).min(1),
  enabled: z.boolean().default(true),
  cooldownMinutes: z.number().int().min(1).default(1),
});

export type Routine = z.infer<typeof Routine>;
