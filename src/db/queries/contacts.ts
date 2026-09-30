import { db } from '../client';
import { contacts, groups, Contact, Group } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getAllGroups(): Promise<Group[]> {
  return await db.select().from(groups).orderBy(desc(groups.createdAt));
}

export async function createGroup(id: string, name: string): Promise<void> {
  await db.insert(groups).values({ id, name, createdAt: Date.now() });
}

export async function deleteGroup(id: string): Promise<void> {
  await db.delete(groups).where(eq(groups.id, id));
}

export async function getAllContacts(): Promise<Contact[]> {
  return await db.select().from(contacts).orderBy(desc(contacts.createdAt));
}

export async function getContactsByGroup(groupId: string): Promise<Contact[]> {
  return await db.select().from(contacts).where(eq(contacts.groupId, groupId));
}

export async function addContact(contact: Contact): Promise<void> {
  await db.insert(contacts).values(contact);
}

export async function batchAddContacts(newContacts: Contact[]): Promise<void> {
  if (newContacts.length === 0) return;
  await db.insert(contacts).values(newContacts);
}

export async function deleteContact(id: string): Promise<void> {
  await db.delete(contacts).where(eq(contacts.id, id));
}
