import { db } from '../client';
import { templates, Template } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const DEFAULT_MAINTENANCE_TEMPLATES = [
  {
    id: 'tmpl_maint_scheduled',
    name: 'Scheduled Maintenance',
    body: 'Notice: Scheduled maintenance will take place on {Date} at {Time}. System services may experience brief interruptions.',
  },
  {
    id: 'tmpl_maint_urgent',
    name: 'Urgent Maintenance',
    body: 'Urgent: Unscheduled maintenance is currently underway to resolve a technical issue. Access may be limited until further notice.',
  },
  {
    id: 'tmpl_maint_completed',
    name: 'Completed Notice',
    body: 'Update: Scheduled maintenance on {Date} has concluded successfully. All systems are operational.',
  },
  {
    id: 'tmpl_maint_access',
    name: 'Premises Access',
    body: 'Reminder: Maintenance technician will visit on {Date} at {Time}. Please ensure site access for inspection.',
  },
  {
    id: 'tmpl_maint_inspection',
    name: 'Routine Inspection',
    body: 'Notice: Routine equipment safety inspection scheduled for {Date} at {Time}. Contact us if you need to reschedule.',
  },
];

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

export async function ensureDefaultTemplates(): Promise<Template[]> {
  try {
    const existing = await getAllTemplates();
    
    // Purge any legacy promotional templates if they exist in the database
    for (const item of existing) {
      const lower = (item.name + ' ' + item.body).toLowerCase();
      if (
        lower.includes('promo') ||
        lower.includes('flash sale') ||
        lower.includes('vip30') ||
        lower.includes('30% off') ||
        lower.includes('winter gear')
      ) {
        await deleteTemplate(item.id);
      }
    }

    const current = await getAllTemplates();
    if (current.length === 0) {
      for (let i = 0; i < DEFAULT_MAINTENANCE_TEMPLATES.length; i++) {
        const tmpl = DEFAULT_MAINTENANCE_TEMPLATES[i];
        await db.insert(templates).values({
          id: tmpl.id,
          name: tmpl.name,
          body: tmpl.body,
          createdAt: Date.now() - (DEFAULT_MAINTENANCE_TEMPLATES.length - i) * 1000,
        });
      }
      return await getAllTemplates();
    }
    return current;
  } catch (err) {
    console.error('Failed to ensure default templates:', err);
    return [];
  }
}

