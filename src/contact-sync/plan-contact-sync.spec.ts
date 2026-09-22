import { describe, expect, it } from 'vitest';
import { planContactSync } from './plan-contact-sync.js';
import type { ExistingContact, IncomingContact } from './plan-contact-sync.types.js';

const incomingContact = (overrides: Partial<IncomingContact> = {}): IncomingContact => ({
  externalId: 'ext-1',
  email: 'jane@example.com',
  name: 'Jane Doe',
  updatedAt: '2024-01-02T00:00:00.000Z',
  ...overrides,
});

const existingContact = (overrides: Partial<ExistingContact> = {}): ExistingContact => ({
  id: 'db-1',
  email: 'jane@example.com',
  name: 'Jane Doe',
  sourceUpdatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('planContactSync', () => {
  it('creates a contact with no existing match', () => {
    const plan = planContactSync([incomingContact()], []);

    expect(plan.creates).toEqual([
      {
        externalId: 'ext-1',
        email: 'jane@example.com',
        name: 'Jane Doe',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    ]);
    expect(plan.updates).toEqual([]);
    expect(plan.skipped).toEqual([]);
    expect(plan.rejected).toEqual([]);
  });

  it('updates a contact when incoming is newer, preserving the existing id', () => {
    const plan = planContactSync([incomingContact()], [existingContact()]);

    expect(plan.updates).toEqual([
      {
        id: 'db-1',
        externalId: 'ext-1',
        email: 'jane@example.com',
        name: 'Jane Doe',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    ]);
    expect(plan.creates).toEqual([]);
  });

  it('skips a contact when it has no newer information than the existing record', () => {
    const plan = planContactSync(
      [incomingContact({ updatedAt: '2024-01-01T00:00:00.000Z' })],
      [existingContact({ sourceUpdatedAt: '2024-01-01T00:00:00.000Z' })],
    );

    expect(plan.skipped).toEqual([
      { email: 'jane@example.com', reason: 'no newer data than existing record' },
    ]);
    expect(plan.updates).toEqual([]);
  });

  it('resolves duplicate incoming records by keeping the latest updatedAt', () => {
    const older = incomingContact({ externalId: 'ext-old', updatedAt: '2024-01-01T00:00:00.000Z' });
    const newer = incomingContact({
      externalId: 'ext-new',
      name: 'Jane Newer',
      updatedAt: '2024-01-03T00:00:00.000Z',
    });

    const plan = planContactSync([older, newer], []);

    expect(plan.creates).toEqual([
      {
        externalId: 'ext-new',
        email: 'jane@example.com',
        name: 'Jane Newer',
        updatedAt: '2024-01-03T00:00:00.000Z',
      },
    ]);
  });

  it('on a timestamp tie, keeps the later input record', () => {
    const first = incomingContact({ externalId: 'ext-first', name: 'First' });
    const second = incomingContact({ externalId: 'ext-second', name: 'Second' });

    const plan = planContactSync([first, second], []);

    expect(plan.creates).toHaveLength(1);
    expect(plan.creates[0].externalId).toBe('ext-second');
  });

  it('rejects records with a missing/invalid email, missing name, or invalid updatedAt', () => {
    const badEmail = incomingContact({ externalId: 'e1', email: 'not-an-email' });
    const missingName = incomingContact({ externalId: 'e2', name: '   ' });
    const badDate = incomingContact({ externalId: 'e3', updatedAt: 'not-a-date' });

    const plan = planContactSync([badEmail, missingName, badDate], []);

    expect(plan.rejected).toHaveLength(3);
    expect(plan.rejected.map((r) => r.reason).sort()).toEqual(
      ['invalid or missing email', 'missing name', 'invalid updatedAt'].sort(),
    );
    expect(plan.creates).toEqual([]);
  });

  it('normalizes email casing/whitespace and collapses internal whitespace in names', () => {
    const plan = planContactSync(
      [incomingContact({ email: '  Jane@Example.com  ', name: '  Jane   Doe  ' })],
      [],
    );

    expect(plan.creates[0].email).toBe('jane@example.com');
    expect(plan.creates[0].name).toBe('Jane Doe');
  });

  it('does not mutate the input arrays and is idempotent across repeated calls', () => {
    const incoming = [incomingContact()];
    const existing = [existingContact()];
    const incomingSnapshot = JSON.parse(JSON.stringify(incoming));
    const existingSnapshot = JSON.parse(JSON.stringify(existing));

    const first = planContactSync(incoming, existing);
    const second = planContactSync(incoming, existing);

    expect(incoming).toEqual(incomingSnapshot);
    expect(existing).toEqual(existingSnapshot);
    expect(first).toEqual(second);
  });
});
