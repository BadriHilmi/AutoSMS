import { db } from '../client';
import { messageLogs, MessageLog } from '../schema';
import { eq, desc, like, and, or } from 'drizzle-orm';

export async function getAllLogs(searchQuery?: string, statusFilter?: string): Promise<MessageLog[]> {
  let query = db.select().from(messageLogs).orderBy(desc(messageLogs.sentAt));
  
  if (statusFilter && statusFilter !== 'ALL') {
    if (searchQuery && searchQuery.trim().length > 0) {
      const search = `%${searchQuery.trim()}%`;
      return await db.select().from(messageLogs).where(
        and(
          eq(messageLogs.status, statusFilter),
          or(
            like(messageLogs.phoneNumber, search),
            like(messageLogs.contactName, search),
            like(messageLogs.messageContent, search)
          )
        )
      ).orderBy(desc(messageLogs.sentAt));
    }
    return await db.select().from(messageLogs).where(eq(messageLogs.status, statusFilter)).orderBy(desc(messageLogs.sentAt));
  }

  if (searchQuery && searchQuery.trim().length > 0) {
    const search = `%${searchQuery.trim()}%`;
    return await db.select().from(messageLogs).where(
      or(
        like(messageLogs.phoneNumber, search),
        like(messageLogs.contactName, search),
        like(messageLogs.messageContent, search)
      )
    ).orderBy(desc(messageLogs.sentAt));
  }

  return await query;
}

export async function createLog(log: MessageLog): Promise<void> {
  await db.insert(messageLogs).values(log);
}

export async function updateLogStatus(id: string, status: MessageLog['status'], deliveredAt?: number, errorReason?: string): Promise<void> {
  await db.update(messageLogs).set({
    status,
    ...(deliveredAt ? { deliveredAt } : {}),
    ...(errorReason ? { errorReason } : {}),
  }).where(eq(messageLogs.id, id));
}

export async function clearAllLogs(): Promise<void> {
  await db.delete(messageLogs);
}
