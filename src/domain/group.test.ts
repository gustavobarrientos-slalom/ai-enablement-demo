import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EVENT_NAME,
  addParticipant,
  canRemoveParticipant,
  createEmptyGroupState,
  isGroupValid,
  isParticipantReferenced,
  namesMatch,
  normalizeName,
  parseGroupState,
  removeParticipant,
  validateEventName,
  validateParticipantName,
} from './group';
import type { Expense, Participant } from './types';
import { makeExpense } from '../test/factories';

function participant(id: string, name: string): Participant {
  return { id, name };
}

function names(participants: readonly Participant[]): string[] {
  return participants.map((item) => item.name);
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) {
    throw new Error(`Expected a successful result, got ${result.error}`);
  }

  return result.value;
}

describe('normalizeName', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeName('  Luis  ')).toBe('Luis');
  });

  it('preserves the original capitalization', () => {
    expect(normalizeName('AnA')).toBe('AnA');
  });
});

describe('namesMatch', () => {
  it('compares case-insensitively', () => {
    expect(namesMatch('Ana', '  ANA  ')).toBe(true);
  });

  it('distinguishes different names', () => {
    expect(namesMatch('Ana', 'Luis')).toBe(false);
  });

  it('treats accents as significant', () => {
    expect(namesMatch('Sofia', 'Sofía')).toBe(false);
  });
});

describe('validateEventName', () => {
  it('accepts a valid name', () => {
    expect(validateEventName('Trip to Oaxaca')).toEqual({
      ok: true,
      value: 'Trip to Oaxaca',
    });
  });

  it('trims the name before storing it', () => {
    expect(validateEventName('  New Year dinner  ')).toEqual({
      ok: true,
      value: 'New Year dinner',
    });
  });

  it('rejects an empty name', () => {
    expect(validateEventName('')).toEqual({ ok: false, error: 'EMPTY_EVENT_NAME' });
  });

  it('rejects a whitespace-only name', () => {
    expect(validateEventName('    ')).toEqual({ ok: false, error: 'EMPTY_EVENT_NAME' });
  });

  it('accepts exactly 60 characters', () => {
    expect(validateEventName('a'.repeat(60)).ok).toBe(true);
  });

  it('rejects 61 characters', () => {
    expect(validateEventName('a'.repeat(61))).toEqual({
      ok: false,
      error: 'EVENT_NAME_TOO_LONG',
    });
  });

  it('uses the default name for a new group', () => {
    expect(createEmptyGroupState()).toEqual({
      eventName: DEFAULT_EVENT_NAME,
      participants: [],
      expenses: [],
    });
    expect(DEFAULT_EVENT_NAME).toBe('New Event');
  });
});

describe('validateParticipantName', () => {
  const existing = [participant('1', 'Ana')];

  it('accepts a valid name', () => {
    expect(validateParticipantName('Luis', existing)).toEqual({
      ok: true,
      value: 'Luis',
    });
  });

  it('trims the name', () => {
    expect(validateParticipantName('  Luis  ', [])).toEqual({ ok: true, value: 'Luis' });
  });

  it('rejects an empty name', () => {
    expect(validateParticipantName('   ', [])).toEqual({ ok: false, error: 'EMPTY_NAME' });
  });

  it('accepts exactly 30 characters', () => {
    expect(validateParticipantName('a'.repeat(30), []).ok).toBe(true);
  });

  it('rejects 31 characters', () => {
    expect(validateParticipantName('a'.repeat(31), [])).toEqual({
      ok: false,
      error: 'NAME_TOO_LONG',
    });
  });

  it('rejects duplicates case-insensitively', () => {
    expect(validateParticipantName('  ANA  ', existing)).toEqual({
      ok: false,
      error: 'DUPLICATE_NAME',
    });
  });
});

describe('participant ordering', () => {
  it('preserves insertion order', () => {
    let list: Participant[] = [];
    list = unwrap(addParticipant(list, 'Ana', '1'));
    list = unwrap(addParticipant(list, 'Luis', '2'));
    list = unwrap(addParticipant(list, 'Sofia', '3'));

    expect(names(list)).toEqual(['Ana', 'Luis', 'Sofia']);
  });

  it('preserves the order of the remaining participants on removal', () => {
    const list = [participant('1', 'Ana'), participant('2', 'Luis'), participant('3', 'Sofia')];

    expect(names(unwrap(removeParticipant(list, '2')))).toEqual(['Ana', 'Sofia']);
  });

  it('places a re-added participant at the end', () => {
    const list = [participant('1', 'Ana'), participant('2', 'Luis'), participant('3', 'Sofia')];
    const afterRemoval = unwrap(removeParticipant(list, '2'));
    const afterReadd = unwrap(addParticipant(afterRemoval, 'Luis', '4'));

    expect(names(afterReadd)).toEqual(['Ana', 'Sofia', 'Luis']);
  });

  it('does not mutate the original list', () => {
    const list = [participant('1', 'Ana')];
    unwrap(addParticipant(list, 'Luis', '2'));

    expect(list).toHaveLength(1);
  });
});

describe('isGroupValid', () => {
  it('is invalid with no participants', () => {
    expect(isGroupValid([])).toBe(false);
  });

  it('is invalid with one participant', () => {
    expect(isGroupValid([participant('1', 'Ana')])).toBe(false);
  });

  it('is valid with two participants', () => {
    expect(isGroupValid([participant('1', 'Ana'), participant('2', 'Luis')])).toBe(true);
  });
});

describe('removing participants with expenses', () => {
  const expenses: Expense[] = [
    makeExpense({ payerId: '1', beneficiaryIds: ['2', '3'] }),
  ];

  it('allows removing a participant without expenses', () => {
    expect(canRemoveParticipant('4', expenses)).toBe(true);
    const list = [participant('4', 'Mario'), participant('1', 'Ana')];
    expect(names(unwrap(removeParticipant(list, '4', expenses)))).toEqual(['Ana']);
  });

  it('blocks removing the payer', () => {
    expect(isParticipantReferenced('1', expenses)).toBe(true);
    expect(canRemoveParticipant('1', expenses)).toBe(false);
  });

  it('blocks removing a beneficiary', () => {
    expect(canRemoveParticipant('3', expenses)).toBe(false);
  });

  it('leaves the list unchanged when removal is blocked', () => {
    const list = [participant('1', 'Ana'), participant('2', 'Luis')];
    const result = removeParticipant(list, '1', expenses);

    expect(result).toEqual({ ok: false, error: 'PARTICIPANT_HAS_EXPENSES' });
    expect(names(list)).toEqual(['Ana', 'Luis']);
  });
});

describe('parseGroupState', () => {
  it('accepts valid state', () => {
    expect(
      parseGroupState({
        eventName: 'Trip to Oaxaca',
        participants: [participant('1', 'Ana'), participant('2', 'Luis')],
      }),
    ).toEqual({
      eventName: 'Trip to Oaxaca',
      participants: [participant('1', 'Ana'), participant('2', 'Luis')],
      expenses: [],
    });
  });

  it.each([
    ['null', null],
    ['a string', 'text'],
    ['an empty object', {}],
    ['participants that are not an array', { eventName: 'Party', participants: {} }],
    ['an empty event name', { eventName: '   ', participants: [] }],
    ['an event name that is too long', { eventName: 'a'.repeat(61), participants: [] }],
    ['a participant without an id', { eventName: 'Party', participants: [{ name: 'Ana' }] }],
    ['a participant without a name', { eventName: 'Party', participants: [{ id: '1' }] }],
    [
      'duplicate ids',
      {
        eventName: 'Party',
        participants: [participant('1', 'Ana'), participant('1', 'Luis')],
      },
    ],
    [
      'duplicate names',
      {
        eventName: 'Party',
        participants: [participant('1', 'Ana'), participant('2', 'ana')],
      },
    ],
  ])('discards %s', (_label, value) => {
    expect(parseGroupState(value)).toBeNull();
  });
});
