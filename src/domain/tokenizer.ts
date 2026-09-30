export interface TokenContext {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  date?: string;
  time?: string;
  [key: string]: string | undefined;
}

export const AVAILABLE_TOKENS = [
  { token: '{FirstName}', label: 'First Name' },
  { token: '{LastName}', label: 'Last Name' },
  { token: '{Date}', label: 'Date' },
  { token: '{Time}', label: 'Time' },
];

export function resolveTokens(templateText: string, context: TokenContext): string {
  let result = templateText;

  // Derive first/last name if only full name provided
  let firstName = context.firstName;
  let lastName = context.lastName;

  if (context.fullName && (!firstName || !lastName)) {
    const parts = context.fullName.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  const now = new Date();
  const dateStr = context.date || now.toLocaleDateString();
  const timeStr = context.time || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  result = result.replace(/\{FirstName\}/gi, firstName || '');
  result = result.replace(/\{LastName\}/gi, lastName || '');
  result = result.replace(/\{FullName\}/gi, context.fullName || `${firstName || ''} ${lastName || ''}`.trim());
  result = result.replace(/\{Date\}/gi, dateStr);
  result = result.replace(/\{Time\}/gi, timeStr);

  return result;
}
