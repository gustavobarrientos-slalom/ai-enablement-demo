import { namesMatch, PARTICIPANT_NAME_MAX_LENGTH } from './group';
import { err, ok, type Contact, type ContactsState, type Result } from './types';

export function validateContactName(
  raw: string,
  contacts: readonly Contact[],
  excludeId?: string,
): Result<string, Exclude<import('./types').ContactError, 'CONTACT_NOT_FOUND'>> {
  const name = raw.trim();

  if (name.length === 0) {
    return err('EMPTY_CONTACT_NAME');
  }

  if (name.length > PARTICIPANT_NAME_MAX_LENGTH) {
    return err('CONTACT_NAME_TOO_LONG');
  }

  if (
    contacts.some(
      (contact) => contact.id !== excludeId && namesMatch(contact.name, name),
    )
  ) {
    return err('DUPLICATE_CONTACT_NAME');
  }

  return ok(name);
}

export function addContact(
  contacts: readonly Contact[],
  raw: string,
  id: string,
): Result<Contact[]> {
  const validation = validateContactName(raw, contacts);

  if (!validation.ok) {
    return err(validation.error);
  }

  return ok([...contacts, { id, name: validation.value, isMe: false }]);
}

export function renameContact(
  contacts: readonly Contact[],
  id: string,
  raw: string,
): Result<Contact[]> {
  const contact = contacts.find((candidate) => candidate.id === id);

  if (!contact) {
    return err('CONTACT_NOT_FOUND');
  }

  const validation = validateContactName(raw, contacts, id);

  if (!validation.ok) {
    return err(validation.error);
  }

  return ok(
    contacts.map((candidate) =>
      candidate.id === id ? { ...candidate, name: validation.value } : candidate,
    ),
  );
}

export function removeContact(
  contacts: readonly Contact[],
  id: string,
): Contact[] {
  return contacts.filter((contact) => contact.id !== id);
}

export function setMeContact(
  contacts: readonly Contact[],
  id: string | null,
): Result<Contact[]> {
  if (id !== null && !contacts.some((contact) => contact.id === id)) {
    return err('CONTACT_NOT_FOUND');
  }

  return ok(contacts.map((contact) => ({ ...contact, isMe: contact.id === id })));
}

export function sortContactsByName(contacts: readonly Contact[]): Contact[] {
  return contacts
    .map((contact, index) => ({ contact, index }))
    .sort(
      (a, b) =>
        a.contact.name.localeCompare(b.contact.name, 'en', {
          sensitivity: 'base',
        }) || a.index - b.index,
    )
    .map(({ contact }) => contact);
}

function isContact(value: unknown): value is Contact {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    name.length > 0 &&
    name.length <= PARTICIPANT_NAME_MAX_LENGTH &&
    typeof candidate.isMe === 'boolean'
  );
}

/** Returns `null` for anything that is not valid persisted contact state. */
export function parseContactsState(value: unknown): ContactsState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.contacts) || !candidate.contacts.every(isContact)) {
    return null;
  }

  const contacts = candidate.contacts as Contact[];
  const ids = new Set<string>();
  const names: string[] = [];
  let meCount = 0;

  for (const contact of contacts) {
    if (
      ids.has(contact.id) ||
      names.some((name) => namesMatch(name, contact.name))
    ) {
      return null;
    }

    ids.add(contact.id);
    names.push(contact.name);
    if (contact.isMe) meCount += 1;
  }

  if (meCount > 1) {
    return null;
  }

  return {
    contacts: contacts.map((contact) => ({
      ...contact,
      name: contact.name.trim(),
    })),
  };
}
