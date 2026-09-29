import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { seedActiveEvent } from '../test/factories';
import { resetAppStore, useAppStore } from '../store/useAppStore';
import { GroupTab } from './GroupTab';
import { ExpensesTab } from './ExpensesTab';
import { SettlementTab } from './SettlementTab';
import { EventsHome } from './EventsHome';

function assertTargets() {
  for (const element of document.querySelectorAll('button, a, input, select')) {
    expect(element, element.outerHTML).toHaveClass(
      element.tagName === 'INPUT' ? 'mobile-input' : 'mobile-target',
    );
    if (element.tagName === 'INPUT') expect(element).toHaveClass('mobile-input');
  }
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  resetAppStore();
  seedActiveEvent();
  useAppStore.getState().addParticipant('Ana');
  useAppStore.getState().addParticipant('Luis');
  const [ana, luis] = useAppStore.getState().events[0]!.participants;
  useAppStore.getState().addExpense({
    concept: 'Dinner',
    amount: '100.00',
    payerId: ana!.id,
    splitMode: 'equal',
    beneficiaryIds: [ana!.id, luis!.id],
    customAmounts: {},
    tipMode: 'none',
    tipValue: '',
    category: 'food',
  });
});

describe('mobile screen conformance', () => {
  it('covers home, group, expenses, settlement, and their interactive states', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);
    assertTargets();
    screen.getByTestId(`event-${useAppStore.getState().events[0]!.id}`).querySelector('button')!.focus();
    await user.keyboard('{ArrowLeft}');
    assertTargets();
    await user.click(screen.getByRole('button', { name: 'Rename New event' }));
    assertTargets();
    cleanup();

    render(<GroupTab />);
    assertTargets();
    await user.click(screen.getByRole('button', { name: 'Add participant' }));
    assertTargets();
    await user.click(screen.getByRole('button', { name: 'Close New participant' }));
    await user.click(screen.getByRole('button', { name: 'Add participant' }));
    await user.type(screen.getByLabelText('Participant name'), 'Carla');
    await user.click(screen.getByRole('button', { name: 'Add participant' }));
    screen.getByRole('group', { name: 'Remove Carla row' }).focus();
    await user.keyboard('{ArrowLeft}');
    assertTargets();
    await user.click(screen.getByRole('button', { name: 'Remove Carla' }));
    assertTargets();
    cleanup();

    render(<ExpensesTab />);
    assertTargets();
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    assertTargets();
    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    await user.click(screen.getByRole('radio', { name: 'Fixed amount' }));
    assertTargets();
    await user.click(screen.getByRole('button', { name: 'Close New expense' }));
    await user.click(screen.getByRole('button', { name: /Dinner Paid by/ }));
    assertTargets();
    cleanup();

    render(<SettlementTab />);
    assertTargets();
  });

  it('uses 16px inputs and decimal keyboards for all money fields', async () => {
    const user = userEvent.setup();
    render(<ExpensesTab />);
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(screen.getByLabelText('Amount')).toHaveAttribute('inputmode', 'decimal');
    await user.click(screen.getByRole('radio', { name: 'Fixed amount' }));
    expect(screen.getByLabelText('Tip amount')).toHaveAttribute('inputmode', 'decimal');
    await user.click(screen.getByRole('radio', { name: 'Percentage' }));
    expect(screen.getByLabelText('Tip percentage')).toHaveAttribute('inputmode', 'decimal');
    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    await user.click(screen.getByLabelText('Ana'));
    expect(screen.getByLabelText('Amount for Ana')).toHaveAttribute('inputmode', 'decimal');
    for (const input of document.querySelectorAll('input')) {
      expect(input).toHaveClass('mobile-input');
    }
  });

  it('uses consistent Material control states across screens and sheets', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);
    expect(screen.getByRole('button', { name: 'All', pressed: true })).toHaveClass('md-segment');
    await user.click(screen.getByRole('button', { name: 'Open', pressed: false }));
    expect(screen.getByRole('button', { name: 'Open', pressed: true })).toHaveClass('md-segment');
    await user.click(screen.getByRole('button', { name: 'Create event' }));
    expect(screen.getByRole('textbox', { name: 'Event name' })).toHaveClass('md-field');
    expect(screen.getByRole('button', { name: 'Create event' })).toHaveClass('md-filled-button');
    cleanup();

    render(<GroupTab />);
    expect(screen.getByRole('textbox', { name: 'Event name' })).toHaveClass('md-field');
    await user.click(screen.getByRole('button', { name: 'Add participant' }));
    expect(screen.getByRole('button', { name: 'Add participant' })).toHaveClass('md-filled-button');
    cleanup();

    render(<ExpensesTab />);
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(screen.getByRole('radio', { name: 'No tip', checked: true })).toHaveClass('md-segment', 'mobile-target');
    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(screen.getByRole('radio', { name: 'Custom', checked: true })).toHaveClass('md-segment', 'mobile-target');
    expect(screen.getByRole('checkbox', { name: 'Ana' })).toHaveClass('md-check');
    expect(screen.getByRole('button', { name: 'Add expense' })).toHaveClass('md-filled-button');
    cleanup();

    render(<SettlementTab />);
    expect(screen.getByRole('button', { name: 'Export PDF' })).toHaveClass('md-tonal-button');
    expect(screen.getAllByRole('checkbox')[0]).toHaveClass('mobile-input', 'peer', 'absolute');
    expect(screen.getAllByRole('checkbox')[0]?.parentElement).toHaveClass('relative', 'block');
  });

  it('groups tip and split choices into full-width segmented pills', async () => {
    const user = userEvent.setup();
    render(<ExpensesTab />);
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    for (const [group, choices] of [
      ['Tip', ['No tip', 'Percentage', 'Fixed amount']],
      ['Split mode', ['Equally', 'Custom']],
    ] as const) {
      const pill = screen.getByRole('radiogroup', { name: group });
      expect(pill).toHaveClass('md-segmented');
      expect(pill).toHaveAttribute('data-segments', String(choices.length));
      expect(pill).toHaveAttribute('data-selected-index', '0');
      for (const label of choices) {
        const choice = screen.getByRole('radio', { name: label });
        expect(choice.parentElement).toBe(pill);
        expect(choice).toHaveClass('md-segment', 'mobile-target');
      }
      await user.click(screen.getByRole('radio', { name: choices[1] }));
      expect(pill).toHaveAttribute('data-selected-index', '1');
      expect(screen.getByRole('radio', { name: choices[1], checked: true })).toHaveClass('md-segment');
      expect(screen.getByRole('radio', { name: choices[0], checked: false })).toHaveClass('md-segment');
      if (choices.length === 3) {
        await user.click(screen.getByRole('radio', { name: choices[2] }));
        expect(pill).toHaveAttribute('data-selected-index', '2');
        await user.click(screen.getByRole('radio', { name: choices[0] }));
        expect(pill).toHaveAttribute('data-selected-index', '0');
      }
    }
  });

  it('uses the same sliding pill for Events filters while retaining pressed-button semantics', async () => {
    const user = userEvent.setup();
    render(<EventsHome />);
    const pill = screen.getByRole('group', { name: 'Filter events' });

    expect(pill).toHaveClass('md-segmented');
    expect(pill).toHaveAttribute('data-segments', '3');
    expect(pill).toHaveAttribute('data-selected-index', '0');
    for (const name of ['All', 'Open', 'Archived']) {
      expect(within(pill).getByRole('button', { name }).parentElement).toBe(pill);
      expect(within(pill).getByRole('button', { name })).toHaveClass('mobile-target', 'md-segment');
    }
    await user.click(within(pill).getByRole('button', { name: 'Open' }));
    expect(pill).toHaveAttribute('data-selected-index', '1');
    expect(screen.getByRole('button', { name: 'Open', pressed: true })).toBeInTheDocument();
    await user.click(within(pill).getByRole('button', { name: 'Archived' }));
    expect(pill).toHaveAttribute('data-selected-index', '2');
    expect(screen.getByRole('button', { name: 'Archived', pressed: true })).toBeInTheDocument();
    await user.click(within(pill).getByRole('button', { name: 'All' }));
    expect(pill).toHaveAttribute('data-selected-index', '0');
  });

  it('keeps filled labels inside text and select fields and errors beneath them', async () => {
    const user = userEvent.setup();
    render(<ExpensesTab />);
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    for (const label of ['Concept', 'Amount', 'Paid by', 'Category']) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveClass('md-field');
      expect(field.parentElement).toHaveClass('md-field-wrap');
      expect(field.nextElementSibling).toHaveClass('md-field-label');
      expect(field.nextElementSibling).toHaveTextContent(label);
    }
    for (const label of ['Concept', 'Amount']) {
      expect(screen.getByRole('textbox', { name: label })).toHaveAttribute('placeholder', ' ');
    }
    // Native select chrome is removed so WebKit (desktop webview) honors the field padding.
    for (const label of ['Paid by', 'Category']) {
      const select = screen.getByRole('combobox', { name: label });
      expect(select).toHaveClass('md-select');
      const chevron = select.parentElement!.querySelector('.md-select-chevron');
      expect(chevron).toHaveAttribute('data-icon', 'chevron-down');
      expect(chevron).toHaveAttribute('aria-hidden', 'true');
    }
    await user.click(screen.getByRole('radio', { name: 'Fixed amount' }));
    expect(screen.getByLabelText('Tip amount').nextElementSibling).toHaveClass('md-field-label');
    expect(screen.getByLabelText('Tip amount')).toHaveAttribute('placeholder', ' ');
    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    await user.click(screen.getByRole('checkbox', { name: 'Ana' }));
    expect(screen.getByLabelText('Amount for Ana')).toHaveClass('md-field-compact');
    cleanup();

    render(<GroupTab />);
    await user.click(screen.getByRole('button', { name: 'Add participant' }));
    const participant = screen.getByRole('textbox', { name: 'Participant name' });
    expect(participant.nextElementSibling).toHaveClass('md-field-label');
    await user.type(participant, 'Ana');
    await user.click(screen.getByRole('button', { name: 'Add participant' }));
    expect(participant).toHaveAttribute('aria-invalid', 'true');
    expect(participant.parentElement?.nextElementSibling).toHaveAttribute('role', 'alert');
    cleanup();

    render(<EventsHome />);
    await user.click(screen.getByRole('button', { name: 'Create event' }));
    expect(screen.getByRole('textbox', { name: 'Event name' }).nextElementSibling)
      .toHaveClass('md-field-label');
  });

  it('keeps one floating label through focus, typing, clearing and blur', async () => {
    const user = userEvent.setup();
    render(<ExpensesTab />);
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    const concept = screen.getByRole('textbox', { name: 'Concept' });
    const label = concept.nextElementSibling;
    expect(concept).toHaveAttribute('placeholder', ' ');
    expect(label).toHaveTextContent('Concept');
    await user.click(concept);
    expect(concept).toHaveFocus();
    await user.type(concept, 'Dinner');
    expect(concept).toHaveValue('Dinner');
    expect(label).toBe(concept.nextElementSibling);
    await user.clear(concept);
    await user.tab();
    expect(concept).not.toHaveFocus();
    expect(concept).toHaveValue('');
    expect(label).toBe(concept.nextElementSibling);
  });
});
