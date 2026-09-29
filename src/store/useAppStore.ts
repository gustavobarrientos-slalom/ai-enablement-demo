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
import { expensesTotal, validateExpense } from '../domain/expense';
import { createId } from '../lib/ids';
import type {
  AppError,
  Expense,
  ExpenseDraft,
  GroupState,
  Participant,
} from '../domain/types';

export const STORAGE_KEY = 'split:v2';
export const STORAGE_VERSION = 2;

export interface AppState extends GroupState {
  lastError: AppError | null;
  setEventName: (raw: string) => boolean;
  addParticipant: (raw: string) => boolean;
  removeParticipant: (id: string) => boolean;
  addExpense: (draft: ExpenseDraft) => boolean;
  updateExpense: (id: string, draft: ExpenseDraft) => boolean;
  removeExpense: (id: string) => void;
  clearError: () => void;
}

type PersistedState = Pick<AppState, 'eventName' | 'participants' | 'expenses'>;

function initialState() {
  return { ...createEmptyGroupState(), lastError: null };
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

      addExpense: (draft) => {
        const result = validateExpense(draft, get().participants, createId());

        if (!result.ok) {
          set({ lastError: result.error });
          return false;
        }

        set({ expenses: [...get().expenses, result.value], lastError: null });
        return true;
      },

      updateExpense: (id, draft) => {
        const { participants, expenses } = get();
        const index = expenses.findIndex((expense) => expense.id === id);

        if (index === -1) {
          return false;
        }

        const result = validateExpense(draft, participants, id);

        if (!result.ok) {
          set({ lastError: result.error });
          return false;
        }

        const next = expenses.slice();
        next[index] = result.value;

        set({ expenses: next, lastError: null });
        return true;
      },

      removeExpense: (id) => {
        set({
          expenses: get().expenses.filter((expense) => expense.id !== id),
          lastError: null,
        });
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
        expenses: state.expenses,
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

export function selectExpenses(state: AppState): Expense[] {
  return state.expenses;
}

export function selectExpensesTotal(state: AppState): number {
  return expensesTotal(state.expenses);
}

export function resetAppStore(): void {
  useAppStore.setState(initialState());
}
