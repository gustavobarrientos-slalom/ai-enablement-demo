import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  addParticipant,
  canRemoveParticipant,
  createEmptyGroupState,
  isGroupValid,
  parseGroupState,
  removeParticipant,
  validateEventName,
} from '../domain/group';
import { createId } from '../lib/ids';
import type { Expense, GroupError, GroupState, Participant } from '../domain/types';

export const STORAGE_KEY = 'split:v1';
export const STORAGE_VERSION = 1;

export interface AppState extends GroupState {
  /** Expenses are owned by a later capability; the group only reads them. */
  expenses: Expense[];
  lastError: GroupError | null;
  setEventName: (raw: string) => boolean;
  addParticipant: (raw: string) => boolean;
  removeParticipant: (id: string) => boolean;
  clearError: () => void;
}

type PersistedState = Pick<AppState, 'eventName' | 'participants'>;

function initialState() {
  return { ...createEmptyGroupState(), expenses: [], lastError: null };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setEventName: (raw) => {
        const result = validateEventName(raw);

        if (!result.ok) {
          set({ lastError: result.error });
          return false;
        }

        set({ eventName: result.value, lastError: null });
        return true;
      },

      addParticipant: (raw) => {
        const result = addParticipant(get().participants, raw, createId());

        if (!result.ok) {
          set({ lastError: result.error });
          return false;
        }

        set({ participants: result.value, lastError: null });
        return true;
      },

      removeParticipant: (id) => {
        const { participants, expenses } = get();
        const result = removeParticipant(participants, id, expenses);

        if (!result.ok) {
          set({ lastError: result.error });
          return false;
        }

        set({ participants: result.value, lastError: null });
        return true;
      },

      clearError: () => set({ lastError: null }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        eventName: state.eventName,
        participants: state.participants,
      }),
      // Unknown versions carry no trustworthy shape, so start empty.
      migrate: () => createEmptyGroupState(),
      merge: (persisted, current) => {
        const parsed = parseGroupState(persisted);

        return parsed ? { ...current, ...parsed } : { ...current, ...createEmptyGroupState() };
      },
    },
  ),
);

export function selectIsGroupValid(state: AppState): boolean {
  return isGroupValid(state.participants);
}

export function selectCanRemoveParticipant(
  state: AppState,
): (participantId: string) => boolean {
  return (participantId: string) => canRemoveParticipant(participantId, state.expenses);
}

export function selectParticipants(state: AppState): Participant[] {
  return state.participants;
}

export function resetAppStore(): void {
  useAppStore.setState(initialState());
}
