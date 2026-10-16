import { db } from '../client';
import { templates, Template } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getAllTemplates(): Promise<Template[]> {
  try {
    return await db.select().from(templates).orderBy(desc(templates.createdAt));
  } catch (err) {
    console.error('Failed to get templates:', err);
    return [];
  }
}

export async function saveTemplate(id: string, name: string, body: string): Promise<void> {
  const templateId = id || `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await db.insert(templates).values({
    id: templateId,
    name: name.trim(),
    body: body.trim(),
    createdAt: Date.now(),
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.delete(templates).where(eq(templates.id, id));
}

const PREMADE_TEMPLATE_NAMES = new Set([
  'scheduled maintenance',
  'urgent maintenance',
  'completed notice',
  'premises access',
  'routine inspection',
]);

/**
 * Purges any default/premade templates from the SQLite database.
 * No premade templates are seeded or inserted; only user-created templates are kept.
 */
export async function ensureDefaultTemplates(): Promise<Template[]> {
  try {
    const existing = await getAllTemplates();

    for (const item of existing) {
      const lowerName = item.name.trim().toLowerCase();
      const lowerBody = item.body.trim().toLowerCase();
      const isPremadeId = item.id.startsWith('tmpl_maint_') || item.id.startsWith('tmpl_promo_');
      const isPremadeName = PREMADE_TEMPLATE_NAMES.has(lowerName);
      const isLegacyPromo =
        lowerBody.includes('flash sale') ||
        lowerBody.includes('vip30') ||
        lowerBody.includes('30% off') ||
        lowerBody.includes('winter gear');

      if (isPremadeId || isPremadeName || isLegacyPromo) {
        await deleteTemplate(item.id);
      }
    }

    return await getAllTemplates();
  } catch (err) {
    console.error('Failed to clean premade templates:', err);
    return [];
  }
}
