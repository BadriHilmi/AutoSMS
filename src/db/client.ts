import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

const expoDb = SQLite.openDatabaseSync('autosms.db');

export const db = drizzle(expoDb, { schema });

export async function initDatabase(): Promise<void> {
  try {
    await expoDb.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        group_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS excluded_numbers (
        phone_number TEXT PRIMARY KEY,
        reason TEXT,
        added_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message_body TEXT NOT NULL,
        group_id TEXT,
        target_numbers TEXT,
        frequency TEXT NOT NULL,
        start_date INTEGER NOT NULL,
        time_of_day TEXT NOT NULL,
        days_of_week TEXT,
        custom_rule TEXT,
        interval_delay_sec INTEGER NOT NULL DEFAULT 10,
        sim_slot INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        total_recipients INTEGER NOT NULL DEFAULT 0,
        sent_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS message_logs (
        id TEXT PRIMARY KEY,
        schedule_id TEXT,
        contact_name TEXT,
        phone_number TEXT NOT NULL,
        message_content TEXT NOT NULL,
        sim_slot INTEGER NOT NULL DEFAULT 0,
        sent_at INTEGER NOT NULL,
        delivered_at INTEGER,
        status TEXT NOT NULL,
        error_reason TEXT,
        FOREIGN KEY(schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_logs_schedule ON message_logs(schedule_id);
      CREATE INDEX IF NOT EXISTS idx_logs_status ON message_logs(status);
      CREATE INDEX IF NOT EXISTS idx_logs_sent_at ON message_logs(sent_at DESC);

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Safe migrations for newly added columns
    try {
      await expoDb.execAsync('ALTER TABLE schedules ADD COLUMN custom_rule TEXT;');
    } catch (_) {
      // Column already exists or table fresh
    }
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
    throw error;
  }
}

export async function getSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const row = await expoDb.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key]
    );
    return row ? row.value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    await expoDb.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  } catch (e) {
    console.error('Failed to setSetting:', key, value, e);
  }
}

