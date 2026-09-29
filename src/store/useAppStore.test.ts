import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  resetAppStore,
  selectCanRemoveParticipant,
  selectIsGroupValid,
  useAppStore,
} from './useAppStore';
import { DEFAULT_EVENT_NAME } from '../domain/group';

function state() {
  return useAppStore.getState();
}

function participantNames(): string[] {
  return state().participants.map((participant) => participant.name);
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
});

describe('initial state', () => {
  it('uses the default event name and has no participants', () => {
    expect(state().eventName).toBe(DEFAULT_EVENT_NAME);
    expect(state().participants).toEqual([]);
  });
});

describe('setEventName', () => {
  it('stores a valid trimmed name', () => {
    expect(state().setEventName('  Trip to Oaxaca  ')).toBe(true);
    expect(state().eventName).toBe('Trip to Oaxaca');
    expect(state().lastError).toBeNull();
  });

  it('rejects an empty name and keeps the previous one', () => {
    state().setEventName('Trip to Oaxaca');

    expect(state().setEventName('   ')).toBe(false);
    expect(state().eventName).toBe('Trip to Oaxaca');
    expect(state().lastError).toBe('EMPTY_EVENT_NAME');
  });

  it('rejects a name longer than 60 characters', () => {
    expect(state().setEventName('a'.repeat(61))).toBe(false);
    expect(state().lastError).toBe('EVENT_NAME_TOO_LONG');
  });
});

describe('addParticipant', () => {
  it('adds participants in insertion order with unique ids', () => {
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    state().addParticipant('Sofia');

    expect(participantNames()).toEqual(['Ana', 'Luis', 'Sofia']);
    expect(new Set(state().participants.map((p) => p.id)).size).toBe(3);
  });

  it('rejects duplicates case-insensitively', () => {
    state().addParticipant('Ana');

    expect(state().addParticipant('  ANA  ')).toBe(false);
    expect(participantNames()).toEqual(['Ana']);
    expect(state().lastError).toBe('DUPLICATE_NAME');
  });

  it('rejects empty or overly long names', () => {
    expect(state().addParticipant('  ')).toBe(false);
    expect(state().lastError).toBe('EMPTY_NAME');

    expect(state().addParticipant('a'.repeat(31))).toBe(false);
    expect(state().lastError).toBe('NAME_TOO_LONG');

    expect(state().participants).toEqual([]);
  });

  it('clears the error after a successful action', () => {
    state().addParticipant('');
    expect(state().lastError).toBe('EMPTY_NAME');

    state().addParticipant('Ana');
    expect(state().lastError).toBeNull();
  });
});

describe('removeParticipant', () => {
  it('removes a participant without expenses', () => {
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    const [ana] = state().participants;

    expect(state().removeParticipant(ana!.id)).toBe(true);
    expect(participantNames()).toEqual(['Luis']);
  });

  it('blocks removing someone with associated expenses', () => {
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    const [ana, luis] = state().participants;
    useAppStore.setState({
      expenses: [{ id: 'e1', payerId: ana!.id, beneficiaryIds: [luis!.id] }],
    });

    expect(state().removeParticipant(ana!.id)).toBe(false);
    expect(state().removeParticipant(luis!.id)).toBe(false);
    expect(participantNames()).toEqual(['Ana', 'Luis']);
    expect(state().lastError).toBe('PARTICIPANT_HAS_EXPENSES');
  });
});

describe('derived selectors', () => {
  it('computes group validity without storing it', () => {
    expect(selectIsGroupValid(state())).toBe(false);

    state().addParticipant('Ana');
    expect(selectIsGroupValid(state())).toBe(false);

    state().addParticipant('Luis');
    expect(selectIsGroupValid(state())).toBe(true);

    const [ana] = state().participants;
    state().removeParticipant(ana!.id);
    expect(selectIsGroupValid(state())).toBe(false);

    expect(Object.keys(state())).not.toContain('isGroupValid');
  });

  it('reports whether a participant can be removed', () => {
    state().addParticipant('Ana');
    const [ana] = state().participants;
    expect(selectCanRemoveParticipant(state())(ana!.id)).toBe(true);

    useAppStore.setState({
      expenses: [{ id: 'e1', payerId: ana!.id, beneficiaryIds: [] }],
    });
    expect(selectCanRemoveParticipant(state())(ana!.id)).toBe(false);
  });
});

describe('persistence', () => {
  it('saves state to localStorage under a versioned key', async () => {
    state().setEventName('Trip to Oaxaca');
    state().addParticipant('Ana');

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const stored = JSON.parse(raw!);
    expect(stored.version).toBe(1);
    expect(stored.state.eventName).toBe('Trip to Oaxaca');
    expect(stored.state.participants).toHaveLength(1);
    expect(stored.state.expenses).toBeUndefined();
  });

  it('restores state and order on reload', async () => {
    state().setEventName('Trip to Oaxaca');
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    state().addParticipant('Sofia');

    const stored = localStorage.getItem(STORAGE_KEY)!;
    resetAppStore();
    expect(state().participants).toEqual([]);

    // Simulates a reload: storage still holds what was saved before.
    localStorage.setItem(STORAGE_KEY, stored);
    await useAppStore.persist.rehydrate();

    expect(state().eventName).toBe('Trip to Oaxaca');
    expect(participantNames()).toEqual(['Ana', 'Luis', 'Sofia']);
  });

  it('discards corrupted data without crashing', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, state: { eventName: 42, participants: 'nope' } }),
    );

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().eventName).toBe(DEFAULT_EVENT_NAME);
    expect(state().participants).toEqual([]);
  });

  it('discards invalid JSON without crashing', async () => {
    localStorage.setItem(STORAGE_KEY, '{ this is not json');

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().eventName).toBe(DEFAULT_EVENT_NAME);
    expect(state().participants).toEqual([]);
  });

  it('discards an unknown version without crashing', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 99,
        state: { eventName: 'Old', participants: [{ id: '1', name: 'Ana' }] },
      }),
    );

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().eventName).toBe(DEFAULT_EVENT_NAME);
    expect(state().participants).toEqual([]);
  });

  it('keeps store actions after rehydrating', async () => {
    await useAppStore.persist.rehydrate();
    expect(typeof state().addParticipant).toBe('function');
  });
});
