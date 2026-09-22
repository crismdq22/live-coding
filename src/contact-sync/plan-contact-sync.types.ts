export type IncomingContact = {
  externalId: string;
  email: string;
  name: string;
  updatedAt: string;
};

export type ExistingContact = {
  id: string;
  email: string;
  name: string;
  sourceUpdatedAt: string;
};

export type ContactToWrite = {
  id?: string;
  externalId: string;
  email: string;
  name: string;
  updatedAt: string;
};

export type SyncPlan = {
  creates: ContactToWrite[];
  updates: ContactToWrite[];
  skipped: Array<{ email: string; reason: string }>;
  rejected: Array<{ input: IncomingContact; reason: string }>;
};
