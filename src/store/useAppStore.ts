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
import { computeBalances } from '../domain/balance';
import { computeTransfers } from '../domain/settle';
import { createId } from '../lib/ids';
import type {
  AppError,
  Balance,
  Expense,
  ExpenseDraft,
  GroupState,
  Participant,
  Result,
  SettlementError,
  Transfer,
} from '../domain/types';

export const STORAGE_KEY = 'split:v2';
export const STORAGE_VERSION = 3;

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
      // Version 2 differs only by the absent optional tip, which
      // `parseGroupState` normalizes to null, so it is safe to pass through.
      // Every other version carries no trustworthy shape, so start empty.
      migrate: (persisted, version) =>
        version === STORAGE_VERSION - 1 ? persisted : createEmptyGroupState(),
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

/**
 * Derived on read. Nothing here is persisted, and these must not be called
 * from inside a Zustand selector: they build new arrays every time, which
 * would make useSyncExternalStore re-render forever. Components select the
 * raw participants and expenses and call these during render instead.
 */
export function selectBalances(state: AppState): Balance[] {
  return computeBalances(state.participants, state.expenses);
}

export function selectTransfers(
  state: AppState,
): Result<Transfer[], SettlementError> {
  return computeTransfers(selectBalances(state));
}

export function resetAppStore(): void {
  useAppStore.setState(initialState());
}
