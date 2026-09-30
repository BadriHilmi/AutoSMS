import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phoneNumber: text('phone_number').notNull(),
  groupId: text('group_id').references(() => groups.id, { onDelete: 'set null' }),
  createdAt: integer('created_at').notNull(),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  body: text('body').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const excludedNumbers = sqliteTable('excluded_numbers', {
  phoneNumber: text('phone_number').primaryKey(),
  reason: text('reason'),
  addedAt: integer('added_at').notNull(),
});

export const schedules = sqliteTable('schedules', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  messageBody: text('message_body').notNull(),
  groupId: text('group_id'),
  targetNumbers: text('target_numbers'), // JSON string array
  frequency: text('frequency').notNull(), // 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'CUSTOM'
  startDate: integer('start_date').notNull(),
  timeOfDay: text('time_of_day').notNull(), // "10:00 AM"
  daysOfWeek: text('days_of_week'), // JSON string array e.g. "[1,3,5]"
  customRule: text('custom_rule'), // JSON string of CustomRecurrenceRule
  intervalDelaySec: integer('interval_delay_sec').notNull().default(10),
  simSlot: integer('sim_slot').notNull().default(0), // 0: SIM 1, 1: SIM 2
  status: text('status').notNull().default('SCHEDULED'), // 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED'
  totalRecipients: integer('total_recipients').notNull().default(0),
  sentCount: integer('sent_count').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const messageLogs = sqliteTable('message_logs', {
  id: text('id').primaryKey(),
  scheduleId: text('schedule_id').references(() => schedules.id, { onDelete: 'cascade' }),
  contactName: text('contact_name'),
  phoneNumber: text('phone_number').notNull(),
  messageContent: text('message_content').notNull(),
  simSlot: integer('sim_slot').notNull().default(0),
  sentAt: integer('sent_at').notNull(),
  deliveredAt: integer('delivered_at'),
  status: text('status').notNull(), // 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING'
  errorReason: text('error_reason'),
});

export type Group = typeof groups.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type ExcludedNumber = typeof excludedNumbers.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type MessageLog = typeof messageLogs.$inferSelect;
