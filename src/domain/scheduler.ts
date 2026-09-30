export type FrequencyType = 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'CUSTOM';
export type RecurrenceUnit = 'DAYS' | 'WEEKS' | 'MONTHS';
export type RecurrenceEndType = 'NEVER' | 'ON_DATE' | 'AFTER_OCCURRENCES';

export interface CustomRecurrenceRule {
  interval: number; // e.g. 1, 2, 3...
  unit: RecurrenceUnit; // 'DAYS' | 'WEEKS' | 'MONTHS'
  daysOfWeek?: number[]; // [0 = Sun, 1 = Mon, ..., 6 = Sat]
  endType: RecurrenceEndType; // 'NEVER' | 'ON_DATE' | 'AFTER_OCCURRENCES'
  endDate?: number; // timestamp in ms
  occurrenceCount?: number; // e.g. 5
  currentOccurrence?: number; // e.g. 0, 1, 2...
}

export interface ScheduleTiming {
  frequency: FrequencyType;
  startDateTimestamp: number;
  timeOfDay: string; // "10:00 AM" or "14:30"
  daysOfWeek?: number[]; // [0 = Sun, 1 = Mon, ..., 6 = Sat]
  customRule?: CustomRecurrenceRule;
}

export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function parseTimeOfDay(timeStr: string): { hours: number; minutes: number } {
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const numbersOnly = clean.replace(/[^0-9:]/g, '');
  const [hStr, mStr] = numbersOnly.split(':');

  let hours = parseInt(hStr || '0', 10);
  const minutes = parseInt(mStr || '0', 10);

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

export function parseCustomRule(rule: CustomRecurrenceRule | string | null | undefined): CustomRecurrenceRule | null {
  if (!rule) return null;
  if (typeof rule === 'string') {
    try {
      return JSON.parse(rule) as CustomRecurrenceRule;
    } catch {
      return null;
    }
  }
  return rule;
}

export function getNextRunTimestamp(
  timing: ScheduleTiming,
  fromTimestamp: number = Date.now()
): number | null {
  const { hours, minutes } = parseTimeOfDay(timing.timeOfDay);
  const target = new Date(timing.startDateTimestamp);
  target.setHours(hours, minutes, 0, 0);

  if (timing.frequency === 'ONE_TIME') {
    return target.getTime();
  }

  if (timing.frequency === 'DAILY') {
    if (target.getTime() > fromTimestamp) {
      return target.getTime();
    }
    const now = new Date(fromTimestamp);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    if (next.getTime() <= fromTimestamp) {
      next.setDate(next.getDate() + 1);
    }
    return next.getTime();
  }

  if (timing.frequency === 'WEEKLY') {
    const days = timing.daysOfWeek && timing.daysOfWeek.length > 0 ? timing.daysOfWeek : [target.getDay()];
    const sortedDays = [...days].sort((a, b) => a - b);

    if (target.getTime() > fromTimestamp && sortedDays.includes(target.getDay())) {
      return target.getTime();
    }

    const now = new Date(fromTimestamp);
    const currentDay = now.getDay();
    const candidate = new Date(now);
    candidate.setHours(hours, minutes, 0, 0);

    for (const day of sortedDays) {
      if (day > currentDay || (day === currentDay && candidate.getTime() > fromTimestamp)) {
        const diff = day - currentDay;
        candidate.setDate(now.getDate() + diff);
        return candidate.getTime();
      }
    }

    // Wrap to first day of next week
    const firstDayNextWeek = sortedDays[0];
    const diff = 7 - currentDay + firstDayNextWeek;
    candidate.setDate(now.getDate() + diff);
    return candidate.getTime();
  }

  if (timing.frequency === 'CUSTOM') {
    const rule = timing.customRule || {
      interval: 1,
      unit: 'DAYS' as RecurrenceUnit,
      endType: 'NEVER' as RecurrenceEndType,
    };

    // Check occurrences limit
    if (
      rule.endType === 'AFTER_OCCURRENCES' &&
      rule.occurrenceCount !== undefined &&
      (rule.currentOccurrence ?? 0) >= rule.occurrenceCount
    ) {
      return null;
    }

    // Check end date
    if (rule.endType === 'ON_DATE' && rule.endDate && fromTimestamp >= rule.endDate) {
      return null;
    }

    const interval = Math.max(1, rule.interval || 1);
    let nextTimestamp: number | null = null;

    if (rule.unit === 'DAYS') {
      const stepMs = interval * 86400000;
      let cand = target.getTime();
      if (cand > fromTimestamp) {
        nextTimestamp = cand;
      } else {
        const diff = fromTimestamp - cand;
        const multiplier = Math.floor(diff / stepMs) + 1;
        nextTimestamp = cand + multiplier * stepMs;
      }
    } else if (rule.unit === 'WEEKS') {
      const days = rule.daysOfWeek && rule.daysOfWeek.length > 0 ? rule.daysOfWeek : [target.getDay()];
      const sortedDays = [...days].sort((a, b) => a - b);

      // Start testing candidates from target or today
      const startCandidate = new Date(Math.max(target.getTime(), fromTimestamp));
      startCandidate.setHours(hours, minutes, 0, 0);

      // Search up to 104 weeks ahead
      for (let dayOffset = 0; dayOffset < 730; dayOffset++) {
        const testDate = new Date(startCandidate);
        testDate.setDate(startCandidate.getDate() + dayOffset);
        testDate.setHours(hours, minutes, 0, 0);

        if (testDate.getTime() <= fromTimestamp) continue;

        const dayOfWeek = testDate.getDay();
        if (!sortedDays.includes(dayOfWeek)) continue;

        // Check if this week aligns with the interval relative to target
        const diffMs = testDate.getTime() - target.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        const weekOffset = Math.floor(diffDays / 7);

        if (weekOffset % interval === 0) {
          nextTimestamp = testDate.getTime();
          break;
        }
      }
    } else if (rule.unit === 'MONTHS') {
      const candidate = new Date(target);
      candidate.setHours(hours, minutes, 0, 0);

      while (candidate.getTime() <= fromTimestamp) {
        candidate.setMonth(candidate.getMonth() + interval);
      }
      nextTimestamp = candidate.getTime();
    }

    if (nextTimestamp === null) {
      return null;
    }

    // Validate against end conditions
    if (rule.endType === 'ON_DATE' && rule.endDate && nextTimestamp > rule.endDate) {
      return null;
    }

    return nextTimestamp;
  }

  return target.getTime();
}

export function formatRecurrenceLabel(
  frequency: FrequencyType | string,
  customRule?: CustomRecurrenceRule | string | null,
  daysOfWeek?: number[] | string | null
): string {
  if (frequency === 'ONE_TIME') return 'Once';
  if (frequency === 'DAILY') return 'Daily';
  if (frequency === 'WEEKLY') {
    let parsedDays: number[] | null = null;
    if (Array.isArray(daysOfWeek)) parsedDays = daysOfWeek;
    else if (typeof daysOfWeek === 'string') {
      try { parsedDays = JSON.parse(daysOfWeek); } catch {}
    }
    if (parsedDays && parsedDays.length > 0 && parsedDays.length < 7) {
      const dayLabels = parsedDays.map((d) => DAY_NAMES_SHORT[d]).join(', ');
      return `Weekly (${dayLabels})`;
    }
    return 'Weekly';
  }

  if (frequency === 'CUSTOM') {
    const rule = parseCustomRule(customRule);
    if (!rule) return 'Custom';

    const interval = rule.interval || 1;
    let unitLabel = '';
    if (rule.unit === 'DAYS') unitLabel = interval === 1 ? 'day' : 'days';
    else if (rule.unit === 'WEEKS') unitLabel = interval === 1 ? 'week' : 'weeks';
    else if (rule.unit === 'MONTHS') unitLabel = interval === 1 ? 'month' : 'months';

    let base = interval === 1 ? `Every ${unitLabel}` : `Every ${interval} ${unitLabel}`;

    if (rule.unit === 'WEEKS' && rule.daysOfWeek && rule.daysOfWeek.length > 0 && rule.daysOfWeek.length < 7) {
      const dayNames = rule.daysOfWeek.map((d) => DAY_NAMES_SHORT[d]).join(', ');
      base += ` (${dayNames})`;
    }

    if (rule.endType === 'AFTER_OCCURRENCES' && rule.occurrenceCount) {
      base += ` • ${rule.occurrenceCount}x`;
    } else if (rule.endType === 'ON_DATE' && rule.endDate) {
      const d = new Date(rule.endDate);
      base += ` • until ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    }

    return base;
  }

  return 'Once';
}
