import type {
  ContactToWrite,
  ExistingContact,
  IncomingContact,
  SyncPlan,
} from './plan-contact-sync.types.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function parseTimestamp(value: string): number | null {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

type Valid = { incoming: IncomingContact; email: string; name: string; time: number };
type Rejected = { input: IncomingContact; reason: string };

function validate(incoming: IncomingContact[]): { valid: Valid[]; rejected: Rejected[] } {
  const valid: Valid[] = [];
  const rejected: Rejected[] = [];

  for (const contact of incoming) {
    const email = typeof contact.email === 'string' ? normalizeEmail(contact.email) : '';
    const name = typeof contact.name === 'string' ? normalizeName(contact.name) : '';
    const time = typeof contact.updatedAt === 'string' ? parseTimestamp(contact.updatedAt) : null;

    if (!email || !EMAIL_RE.test(email)) {
      rejected.push({ input: contact, reason: 'invalid or missing email' });
    } else if (!name) {
      rejected.push({ input: contact, reason: 'missing name' });
    } else if (time === null) {
      rejected.push({ input: contact, reason: 'invalid updatedAt' });
    } else {
      valid.push({ incoming: contact, email, name, time });
    }
  }

  return { valid, rejected };
}

function dedupe(valid: Valid[]): Map<string, Valid> {
  const byEmail = new Map<string, Valid>();
  for (const entry of valid) {
    const current = byEmail.get(entry.email);
    if (!current || entry.time >= current.time) {
      byEmail.set(entry.email, entry);
    }
  }
  return byEmail;
}

function toWrite(entry: Valid, id?: string): ContactToWrite {
  return {
    ...(id ? { id } : {}),
    externalId: entry.incoming.externalId,
    email: entry.email,
    name: entry.name,
    updatedAt: entry.incoming.updatedAt,
  };
}

export function planContactSync(
  incoming: IncomingContact[],
  existing: ExistingContact[],
): SyncPlan {
  const { valid, rejected } = validate(incoming);
  const deduped = dedupe(valid);

  const existingByEmail = new Map<string, ExistingContact>();
  for (const contact of existing) {
    existingByEmail.set(normalizeEmail(contact.email), contact);
  }

  const creates: ContactToWrite[] = [];
  const updates: ContactToWrite[] = [];
  const skipped: SyncPlan['skipped'] = [];

  for (const entry of deduped.values()) {
    const match = existingByEmail.get(entry.email);
    if (!match) {
      creates.push(toWrite(entry));
      continue;
    }

    const existingTime = parseTimestamp(match.sourceUpdatedAt);
    if (existingTime === null || entry.time > existingTime) {
      updates.push(toWrite(entry, match.id));
    } else {
      skipped.push({ email: entry.email, reason: 'no newer data than existing record' });
    }
  }

  const byEmail = <T extends { email: string }>(a: T, b: T) => a.email.localeCompare(b.email);
  const rejectedByEmail = (a: Rejected, b: Rejected) =>
    (a.input.email ?? '').localeCompare(b.input.email ?? '');

  return {
    creates: creates.sort(byEmail),
    updates: updates.sort(byEmail),
    skipped: skipped.sort(byEmail),
    rejected: rejected.sort(rejectedByEmail),
  };
}
