import type { GroupError } from '../domain/types';

export const PARTICIPANT_HAS_EXPENSES_MESSAGE = 'Has associated expenses';

export const ERROR_MESSAGES: Record<GroupError, string> = {
  EMPTY_EVENT_NAME: 'The event name is required',
  EVENT_NAME_TOO_LONG: 'The event name must be at most 60 characters',
  EMPTY_NAME: 'The name is required',
  NAME_TOO_LONG: 'The name must be at most 30 characters',
  DUPLICATE_NAME: 'A participant with that name already exists',
  PARTICIPANT_HAS_EXPENSES: PARTICIPANT_HAS_EXPENSES_MESSAGE,
};

export const INVALID_GROUP_HINT = 'Add at least 2 participants to continue';

export function errorMessage(error: GroupError | null): string | null {
  return error ? ERROR_MESSAGES[error] : null;
}
