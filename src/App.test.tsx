import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { decodeShare, encodeShare } from './domain/share';
import { STORAGE_KEY, resetAppStore, useAppStore } from './store/useAppStore';
import { LINK_COPIED, EVENT_IMPORTED, INVALID_SHARE_LINK } from './ui/messages';

const platformState = vi.hoisted(() => ({ kind: 'web' as 'web' | 'desktop' }));

vi.mock('./platform', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./platform')>();

  return {
    ...actual,
    get platformKind() {
      return platformState.kind;
    },
  };
});

function setShareHash(payload: string): void {
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}#share=${payload}`,
  );
}

function createEvent(name: string): string {
  const id = useAppStore.getState().createEvent(name);

  if (id === null) {
    throw new Error(`failed to create ${name}`);
  }

  return id;
}

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
);

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
  window.history.replaceState(null, '', '/ai-enablement-demo/');
});

afterEach(() => {
  vi.useRealTimers();
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, 'clipboard');
  }
  Reflect.deleteProperty(document, 'execCommand');
  window.history.replaceState(null, '', '/ai-enablement-demo/');
  platformState.kind = 'web';
  vi.restoreAllMocks();
});

describe('event sharing', () => {
  it('opens the Contacts screen from the Events home and returns to Events', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Contacts' }));
    expect(screen.getByRole('heading', { name: 'Contacts' })).toBeInTheDocument();
    expect(screen.getByText('No contacts yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to events' }));
    expect(screen.getByRole('heading', { name: 'Events' })).toBeInTheDocument();
  });

  it('opens share options without copying, then copies the hash link', async () => {
    const user = userEvent.setup();
    createEvent('Dinner');
    useAppStore.getState().addParticipant('Ana');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    describe('mobile navigation', () => {
      it('pushes an opened event and holds the popped screen until animationend', async () => {
        const user = userEvent.setup();
        const id = createEvent('Dinner');
        useAppStore.getState().closeEvent();
        render(<App />);
        await user.click(screen.getByTestId(`event-${id}`).querySelector('button')!);
        expect(screen.getByRole('tabpanel').parentElement).toHaveClass('animate-push-in');
        await user.click(screen.getByRole('button', { name: 'Back to events' }));
        const exiting = screen.getByTestId('exiting-screen');
        expect(exiting).toHaveClass('animate-pop-out');
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
        fireEvent.animationEnd(exiting);
        expect(screen.getByText('Your events')).toBeInTheDocument();
        expect(screen.queryByTestId('exiting-screen')).toBeNull();
        expect(useAppStore.getState().activeEventId).toBeNull();
      });

      it('does not animate screen changes when reduced motion is enabled', async () => {
        const original = window.matchMedia;
        window.matchMedia = vi.fn().mockReturnValue({
          matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
        });
        try {
          const id = createEvent('Dinner');
          useAppStore.getState().closeEvent();
          render(<App />);
          await userEvent.setup().click(screen.getByTestId(`event-${id}`).querySelector('button')!);
          expect(screen.getByRole('tabpanel').parentElement).not.toHaveClass('animate-push-in');
          await userEvent.setup().click(screen.getByRole('button', { name: 'Back to events' }));
          expect(screen.queryByTestId('exiting-screen')).toBeNull();
          expect(useAppStore.getState().activeEventId).toBeNull();
        } finally {
          window.matchMedia = original;
        }
      });
    });

    render(<App />);
    const shareButton = screen.getByRole('button', { name: 'Share' });
    expect(shareButton).toHaveClass('mobile-target', 'md-icon-button');
    expect(shareButton).not.toHaveClass('md-tonal-button');
    expect(shareButton).toHaveAttribute('title', 'Share');
    expect(shareButton).toHaveTextContent('');
    expect(shareButton.querySelector('svg')).toHaveAttribute('data-icon', 'share-from-square');
    await user.click(screen.getByRole('button', { name: 'Share' }));

    expect(screen.getByRole('dialog', { name: 'Share event' })).toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const copiedUrl = new URL(String(writeText.mock.calls[0]?.[0]));
    expect(copiedUrl.pathname).toBe('/ai-enablement-demo/');
    expect(copiedUrl.search).toBe('');
    expect(copiedUrl.hash).toMatch(/^#share=/);
    expect(decodeShare(copiedUrl.hash.slice('#share='.length)).ok).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent(LINK_COPIED);
  });

  it('dismisses the successful copy message after a short delay', async () => {
    vi.useFakeTimers();
    createEvent('Dinner');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    expect(screen.getByRole('status')).toHaveTextContent(LINK_COPIED);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(screen.queryByRole('status')).toBeNull();
    vi.useRealTimers();
  });

  it('shows a locally generated QR code from the same share URL', async () => {
    const user = userEvent.setup();
    createEvent('Dinner');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Share' }));
    await user.click(screen.getByRole('button', { name: 'Show QR code' }));
    const qr = await screen.findByRole('img', { name: 'QR code for Dinner' });
    expect(qr).toHaveClass('min-w-[240px]');
    expect(qr.nextElementSibling).toHaveTextContent('Dinner');
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close QR code' }));
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(String(writeText.mock.calls[0]?.[0])).toContain('#share=');
  });

  it('imports a valid link as a new active event and clears the hash', async () => {
    const firstId = createEvent('First');
    useAppStore.getState().addParticipant('Ana');
    const secondId = createEvent('Second');
    useAppStore.getState().addParticipant('Luis');
    const originals = [firstId, secondId].map((id) =>
      JSON.stringify(useAppStore.getState().events.find((event) => event.id === id)),
    );
    const sharedEvent = useAppStore.getState().events.find((event) => event.id === secondId)!;
    setShareHash(encodeShare(sharedEvent));

    render(<App />);

    expect(await screen.findByRole('status')).toHaveTextContent(EVENT_IMPORTED);
    expect(window.location.hash).toBe('');
    expect(useAppStore.getState().events).toHaveLength(3);
    expect(useAppStore.getState().activeEventId).not.toBe(secondId);
    expect(
      useAppStore.getState().events.slice(0, 2).map((event) => JSON.stringify(event)),
    ).toEqual(originals);
  });

  it('ignores a valid share link on the desktop platform', async () => {
    platformState.kind = 'desktop';
    const id = createEvent('Shared');
    useAppStore.getState().addParticipant('Ana');
    const event = useAppStore.getState().events.find((candidate) => candidate.id === id)!;
    const payload = encodeShare(event);
    setShareHash(payload);

    render(<App />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(useAppStore.getState().events).toHaveLength(1);
    expect(screen.queryByRole('status')).toBeNull();
    expect(window.location.hash).toBe(`#share=${payload}`);
  });

  it('does not import again when remounted after the URL hash is cleared', async () => {
    const id = createEvent('Shared');
    useAppStore.getState().addParticipant('Ana');
    const event = useAppStore.getState().events.find((candidate) => candidate.id === id)!;
    setShareHash(encodeShare(event));

    const firstMount = render(<App />);
    expect(await screen.findByRole('status')).toHaveTextContent(EVENT_IMPORTED);
    firstMount.unmount();

    render(<App />);
    expect(useAppStore.getState().events).toHaveLength(2);
    expect(window.location.hash).toBe('');
  });

  it('clears an invalid link without changing stored or persisted state', async () => {
    const id = createEvent('Existing');
    useAppStore.getState().addParticipant('Ana');
    const eventsBefore = useAppStore.getState().events;
    const activeIdBefore = useAppStore.getState().activeEventId;
    const persistedBefore = localStorage.getItem(STORAGE_KEY);
    setShareHash('not-valid-compressed-data');

    render(<App />);

    expect(await screen.findByRole('status')).toHaveTextContent(INVALID_SHARE_LINK);
    expect(window.location.hash).toBe('');
    expect(useAppStore.getState().events).toBe(eventsBefore);
    expect(useAppStore.getState().activeEventId).toBe(activeIdBefore);
    expect(useAppStore.getState().events[0]?.id).toBe(id);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(persistedBefore);
  });

  it('shows no success message when clipboard copying fails', async () => {
    const user = userEvent.setup();
    createEvent('Dinner');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Share' }));

    expect(screen.queryByRole('status')).toBeNull();
  });
});
