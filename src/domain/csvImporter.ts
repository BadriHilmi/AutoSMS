export interface ParsedCsvContact {
  name: string;
  phoneNumber: string;
  groupName?: string;
}

export function cleanPhoneNumber(rawPhone: string): string {
  // Retain leading +, strip out spaces, dashes, parentheses
  const trimmed = rawPhone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

export function parseContactsCsv(csvContent: string): ParsedCsvContact[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));

  let nameIdx = headers.findIndex(h => h.includes('name'));
  let phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('number') || h.includes('tel'));
  let groupIdx = headers.findIndex(h => h.includes('group') || h.includes('tag') || h.includes('category'));

  // If no header match, assume col 0 is Name, col 1 is Phone
  if (nameIdx === -1) nameIdx = 0;
  if (phoneIdx === -1) phoneIdx = 1;

  const results: ParsedCsvContact[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
    if (row.length <= Math.max(nameIdx, phoneIdx)) continue;

    const name = row[nameIdx] || 'Unnamed Contact';
    const rawPhone = row[phoneIdx] || '';
    const phone = cleanPhoneNumber(rawPhone);
    const groupName = groupIdx !== -1 ? row[groupIdx] : undefined;

    if (phone.length >= 5) {
      results.push({ name, phoneNumber: phone, groupName });
    }
  }

  return results;
}
