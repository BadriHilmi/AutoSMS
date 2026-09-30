import { db } from '../client';
import { excludedNumbers, ExcludedNumber } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getAllExcludedNumbers(): Promise<ExcludedNumber[]> {
  return await db.select().from(excludedNumbers).orderBy(desc(excludedNumbers.addedAt));
}

export async function isNumberExcluded(phoneNumber: string): Promise<boolean> {
  const result = await db.select().from(excludedNumbers).where(eq(excludedNumbers.phoneNumber, phoneNumber)).limit(1);
  return result.length > 0;
}

export async function addExcludedNumber(phoneNumber: string, reason?: string): Promise<void> {
  await db.insert(excludedNumbers).values({
    phoneNumber,
    reason: reason || 'Manual exclusion',
    addedAt: Date.now(),
  }).onConflictDoNothing();
}

export async function removeExcludedNumber(phoneNumber: string): Promise<void> {
  await db.delete(excludedNumbers).where(eq(excludedNumbers.phoneNumber, phoneNumber));
}
