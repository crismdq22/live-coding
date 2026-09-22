# Contact-Sync Planning Feature — Implementation Plan

## Goal

Implement `planContactSync(incoming, existing)` as pure business logic, expose it via a NestJS endpoint, ship tests.

## 1. Project scaffold

- `nest new` (or reuse existing Nest app if one already exists in this repo).
- Add a `contact-sync` module: `contact-sync.module.ts`, `contact-sync.controller.ts`, `contact-sync.service.ts`.
- Business logic (`planContactSync`) lives in its own file with **no Nest imports** (`src/contact-sync/plan-contact-sync.ts`) so it stays framework-agnostic and unit-testable without bootstrapping Nest — satisfies the "keep business logic separate from HTTP/DB/CRM code" constraint.

## 2. Types

In `plan-contact-sync.types.ts`:

- `IncomingContact { externalId: string; email: string; name: string; updatedAt: string }`
- `ExistingContact { id: string; email: string; name: string; sourceUpdatedAt: string }`
- `ContactToWrite` (union covering create/update payload — include `id?` for updates, normalized `email`/`name`, `sourceUpdatedAt`)
- `SyncPlan { creates: ContactToWrite[]; updates: ContactToWrite[]; skipped: {email, reason}[]; rejected: {input: IncomingContact, reason: string}[] }`

## 3. Normalization helpers

- `normalizeEmail(email)`: trim + lowercase.
- `normalizeName(name)`: trim + collapse internal whitespace (`replace(/\s+/g, ' ')`).
- `parseTimestamp(value)`: return `Date` or `null` if invalid (`new Date(x)`, check `!isNaN`).

## 4. Validation

- Reject when: email missing/empty, email fails a basic regex check, name missing/empty after normalization, or `updatedAt` fails `parseTimestamp`.
- Validation runs **before** dedup so bad records never influence duplicate resolution.

## 5. Deduplication

- Group valid incoming records by normalized email.
- Within each group, keep the record with the latest `updatedAt`; on a tie, keep whichever appears later in the input array (last-write-wins).
- Do this with a `Map<string, IncomingContact>`, iterating input in order and overwriting on `>=` timestamp — naturally gives "later wins ties" without extra branching.

## 6. Matching against existing records

- Build a `Map<normalizedEmail, ExistingContact>` from `existing` once.
- For each deduped incoming record:
  - No match → **create**.
  - Match found → compare `updatedAt` vs `sourceUpdatedAt`:
    - Incoming strictly newer → **update** (preserve existing `id`).
    - Not newer (equal or older) → **skipped**, with reason (e.g. `"no newer data"`).

## 7. Determinism

- Sort `creates`, `updates`, `skipped`, `rejected` by normalized email before returning.
- No mutation of `incoming`/`existing` — build new objects/arrays throughout (map/filter, spread, `Object.freeze` not required but avoid in-place edits).

## 8. Assemble `planContactSync`

Pipeline: `validate → dedupe → match → sort → return SyncPlan`. Keep each step a small pure function for readability/testability.

## 9. Database: SQLite

- Use SQLite as the local stand-in for the "Postgres-style" existing-contacts store (`better-sqlite3` or `@nestjs/typeorm` + `typeorm` with the `sqlite` driver — pick TypeORM if the rest of the app will grow entities beyond this exercise, otherwise a single `better-sqlite3` file is enough).
- `ContactEntity` (or plain table): `id`, `email`, `name`, `sourceUpdatedAt` — mirrors `ExistingContact`.
- `ContactsRepository`/service method `findAll()` reads existing contacts from SQLite and maps rows into `ExistingContact[]` before handing them to `planContactSync` — DB access stays in the repository layer, never inside the pure function.
- A `.sqlite` db file (e.g. `data/contacts.db`) is fine for this exercise; add it to `.gitignore`.
- Applying the returned plan (actually writing creates/updates back to SQLite) is a separate concern from planning — note it as a follow-up endpoint/job, not part of `planContactSync` itself.

## 10. NestJS exposure

- `POST /contact-sync/plan`
- DTO with `class-validator` (`incoming: IncomingContactDto[]`) for request shape validation — separate from the domain-level normalization/validation inside `planContactSync` itself.
- Controller calls `ContactSyncService.plan(dto)` → service loads `existing` from the SQLite repository (step 9), calls the pure `planContactSync` function, and returns the `SyncPlan`.
- Note in code/README: this endpoint is planning-only — it returns what *would* be written; a separate endpoint/job would apply the plan against SQLite.

## 11. Tests (Jest, no Nest bootstrap needed)

Cover at minimum:

1. New contact with no existing match → appears in `creates`.
2. Existing contact with newer `updatedAt` → appears in `updates`, preserves existing `id`.
3. Duplicate incoming records for same email → only the latest survives dedup (test both differing timestamps and a tie).
4. Invalid records (bad/missing email, missing name, invalid `updatedAt`) → land in `rejected` with a reason, and don't affect other groups.
5. Existing contact with equal/older `updatedAt` → `skipped`.
6. Same input run twice → identical output (determinism/idempotency check).

Keep these as pure unit tests against `planContactSync` with in-memory arrays — no SQLite needed to test the business logic. A thin integration test can cover the repository → SQLite round trip separately if asked.