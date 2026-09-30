import { db } from '../client';
import { schedules, Schedule } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getAllSchedules(): Promise<Schedule[]> {
  return await db.select().from(schedules).orderBy(desc(schedules.createdAt));
}

export async function getSchedulesByStatus(status: Schedule['status']): Promise<Schedule[]> {
  return await db.select().from(schedules).where(eq(schedules.status, status)).orderBy(desc(schedules.createdAt));
}

export async function getScheduleById(id: string): Promise<Schedule | undefined> {
  const result = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
  return result[0];
}

export async function createSchedule(newSchedule: Schedule): Promise<void> {
  await db.insert(schedules).values(newSchedule);
}

export async function updateScheduleStatus(id: string, status: Schedule['status']): Promise<void> {
  await db.update(schedules).set({ status }).where(eq(schedules.id, id));
}

export async function updateScheduleProgress(id: string, sentCount: number): Promise<void> {
  await db.update(schedules).set({ sentCount }).where(eq(schedules.id, id));
}

export async function updateSchedule(id: string, updates: Partial<Omit<Schedule, 'id'>>): Promise<void> {
  await db.update(schedules).set(updates).where(eq(schedules.id, id));
}

export async function deleteSchedule(id: string): Promise<void> {
  await db.delete(schedules).where(eq(schedules.id, id));
}
