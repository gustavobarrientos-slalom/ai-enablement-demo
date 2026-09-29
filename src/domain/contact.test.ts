import { describe, expect, it } from 'vitest';
import {
  addContact,
  parseContactsState,
  removeContact,
  renameContact,
  setMeContact,
  sortContactsByName,
  validateContactName,
} from './contact';
import type { Contact } from './types';

function contact(id: string, name: string, isMe = false): Contact {
  return { id, name, isMe };
}

describe('contact name validation', () => {
  it('trims valid names and rejects empty or overly long names', () => {
    expect(validateContactName('  Luis  ', [])).toEqual({ ok: true, value: 'Luis' });
    expect(validateContactName('  ', [])).toEqual({
      ok: false,
      error: 'EMPTY_CONTACT_NAME',
    });
    expect(validateContactName('a'.repeat(31), [])).toEqual({
      ok: false,
      error: 'CONTACT_NAME_TOO_LONG',
    });
  });

  it('enforces case-insensitive uniqueness', () => {
    expect(validateContactName(' ANA ', [contact('1', 'Ana')])).toEqual({
      ok: false,
      error: 'DUPLICATE_CONTACT_NAME',
    });
  });

  it('stores names trimmed when adding', () => {
    expect(addContact([], '  Luis  ', '2')).toEqual({
      ok: true,
      value: [contact('2', 'Luis')],
    });
  });
});

describe('contact mutations', () => {
  it('renames a contact without losing its Me flag', () => {
    expect(renameContact([contact('1', 'Ana', true)], '1', 'Ana Garcia')).toEqual({
      ok: true,
      value: [contact('1', 'Ana Garcia', true)],
    });
  });

  it('rejects a rename that duplicates another contact', () => {
    expect(
      renameContact([contact('1', 'Ana'), contact('2', 'Luis')], '2', ' ANA '),
    ).toEqual({ ok: false, error: 'DUPLICATE_CONTACT_NAME' });
  });

  it('deletes without affecting unrelated contacts', () => {
    expect(removeContact([contact('1', 'Ana'), contact('2', 'Luis')], '1')).toEqual([
      contact('2', 'Luis'),
    ]);
  });
});

describe('Me contact', () => {
  it('keeps at most one contact marked and supports unmarking', () => {
    const contacts = [contact('1', 'Ana', true), contact('2', 'Luis')];
    const marked = setMeContact(contacts, '2');

    expect(marked).toEqual({
      ok: true,
      value: [contact('1', 'Ana'), contact('2', 'Luis', true)],
    });
    expect(marked.ok && setMeContact(marked.value, null)).toEqual({
      ok: true,
      value: [contact('1', 'Ana'), contact('2', 'Luis')],
    });
  });

  it('rejects an unknown contact id', () => {
    expect(setMeContact([], 'missing')).toEqual({
      ok: false,
      error: 'CONTACT_NOT_FOUND',
    });
  });
});

describe('sortContactsByName', () => {
  it('sorts alphabetically without mutating the original array', () => {
    const contacts = [contact('1', 'Sofia'), contact('2', 'Ana'), contact('3', 'Luis')];

    expect(sortContactsByName(contacts).map(({ name }) => name)).toEqual([
      'Ana',
      'Luis',
      'Sofia',
    ]);
    expect(contacts.map(({ name }) => name)).toEqual(['Sofia', 'Ana', 'Luis']);
  });
});

describe('parseContactsState', () => {
  it('accepts and normalizes valid persisted contacts', () => {
    expect(parseContactsState({ contacts: [contact('1', ' Ana ', true)] })).toEqual({
      contacts: [contact('1', 'Ana', true)],
    });
  });

  it.each([
    null,
    {},
    { contacts: 'invalid' },
    { contacts: [{ id: '1', name: '', isMe: false }] },
    { contacts: [contact('1', 'Ana'), contact('1', 'Luis')] },
    { contacts: [contact('1', 'Ana'), contact('2', 'ana')] },
    { contacts: [contact('1', 'Ana', true), contact('2', 'Luis', true)] },
  ])('rejects invalid persisted state %#', (value) => {
    expect(parseContactsState(value)).toBeNull();
  });
});
