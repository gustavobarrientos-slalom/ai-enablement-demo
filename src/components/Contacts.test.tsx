import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Contacts } from './Contacts';
import { resetAppStore, useAppStore } from '../store/useAppStore';

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
});

describe('Contacts screen', () => {
  it('shows an empty state and an add-contact action', () => {
    render(<Contacts />);

    expect(screen.getByText('No contacts yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add contact' })).toBeInTheDocument();
  });

  it('lists contacts alphabetically', () => {
    useAppStore.getState().addContact('Sofia');
    useAppStore.getState().addContact('Ana');
    useAppStore.getState().addContact('Luis');
    render(<Contacts />);

    const rows = within(screen.getByRole('list', { name: 'Contacts' })).getAllByRole('listitem');
    expect(rows.map((row) => row.querySelector('.text-base')?.textContent)).toEqual([
      'Ana',
      'Luis',
      'Sofia',
    ]);
  });

  it('adds and renames contacts', async () => {
    const user = userEvent.setup();
    render(<Contacts />);
    await user.click(screen.getByRole('button', { name: 'Add contact' }));
    const dialog = screen.getByRole('dialog', { name: 'New contact' });
    await user.type(within(dialog).getByLabelText('Contact name'), 'Ana');
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }));

    expect(screen.getByText('Ana')).toBeInTheDocument();
    const anaRow = screen.getByRole('button', { name: 'Ana' });
    expect(screen.queryByRole('button', { name: 'Rename Ana' })).toBeNull();
    anaRow.focus();
    await user.keyboard('{ArrowLeft}');
    await user.click(screen.getByRole('button', { name: 'Rename Ana' }));
    const input = screen.getByLabelText('Contact name');
    await user.clear(input);
    await user.type(input, 'Ana Garcia');
    await user.click(screen.getByRole('button', { name: 'Save name' }));

    expect(screen.getByText('Ana Garcia')).toBeInTheDocument();
    expect(screen.queryByText('Ana', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('shows validation errors and keeps duplicate contacts unchanged', async () => {
    const user = userEvent.setup();
    useAppStore.getState().addContact('Ana');
    render(<Contacts />);

    await user.click(screen.getByRole('button', { name: 'Add contact' }));
    const dialog = screen.getByRole('dialog', { name: 'New contact' });
    await user.type(within(dialog).getByLabelText('Contact name'), 'ANA');
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A contact with that name already exists',
    );
    expect(useAppStore.getState().contacts).toHaveLength(1);
  });

  it('shows required and maximum-length validation errors', async () => {
    const user = userEvent.setup();
    render(<Contacts />);

    await user.click(screen.getByRole('button', { name: 'Add contact' }));
    let dialog = screen.getByRole('dialog', { name: 'New contact' });
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('The name is required');

    await user.type(within(dialog).getByLabelText('Contact name'), 'a'.repeat(31));
    await user.click(within(dialog).getByRole('button', { name: 'Add contact' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'The name must be at most 30 characters',
    );
  });

  it('deletes contacts and toggles the single Me contact', async () => {
    const user = userEvent.setup();
    useAppStore.getState().addContact('Ana');
    useAppStore.getState().addContact('Luis');
    render(<Contacts />);

    const anaRow = screen.getByRole('button', { name: 'Ana' });
    await user.click(anaRow);
    expect(anaRow).toHaveAttribute('aria-pressed', 'true');
    expect(anaRow.querySelector('svg[data-icon="check"]')).toBeInTheDocument();

    const luisRow = screen.getByRole('button', { name: 'Luis' });
    await user.click(luisRow);
    expect(anaRow).toHaveAttribute('aria-pressed', 'false');
    expect(luisRow).toHaveAttribute('aria-pressed', 'true');
    expect(anaRow.querySelector('svg[data-icon="check"]')).toBeNull();

    anaRow.focus();
    await user.keyboard('{ArrowLeft}');
    await user.click(screen.getByRole('button', { name: 'Delete Ana' }));
    await user.click(screen.getByRole('button', { name: 'Confirm deletion' }));
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(useAppStore.getState().contacts).toHaveLength(1);
  });
});
