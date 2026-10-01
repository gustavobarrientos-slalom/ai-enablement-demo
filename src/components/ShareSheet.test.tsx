import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareSheet } from './ShareSheet';

describe('ShareSheet QR view', () => {
  it('keeps the QR output black on white and accessible in dark mode', async () => {
    document.documentElement.classList.add('dark');
    const user = userEvent.setup();
    render(
      <ShareSheet
        open
        name="Trip to Oaxaca"
        url="https://example.test/#share=payload"
        onClose={vi.fn()}
        onCopy={vi.fn().mockResolvedValue(true)}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Show QR code' }));
    const svg = await screen.findByRole('img', { name: 'QR code for Trip to Oaxaca' });
    expect(svg).toHaveClass('min-w-[240px]');
    expect(svg.querySelector('rect')).toHaveAttribute('fill', '#FFFFFF');
    expect(svg.querySelector('path')).toHaveAttribute('fill', '#000000');
    expect(svg.nextElementSibling).toHaveTextContent('Trip to Oaxaca');
    document.documentElement.classList.remove('dark');
  });

  it('offers copy when the QR capacity is exceeded', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn().mockResolvedValue(true);
    render(
      <ShareSheet
        open
        name="Large event"
        url={`https://example.test/#share=${'x'.repeat(4000)}`}
        onClose={vi.fn()}
        onCopy={onCopy}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Show QR code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too much data for a QR code — use the link instead',
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('does not make network calls while generating an inline QR', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const openSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const imageSpy = vi.spyOn(globalThis, 'Image');
    const user = userEvent.setup();
    render(
      <ShareSheet
        open
        name="Offline"
        url="https://example.test/#share=payload"
        onClose={vi.fn()}
        onCopy={vi.fn().mockResolvedValue(true)}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Show QR code' }));
    await screen.findByRole('img', { name: 'QR code for Offline' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
    expect(imageSpy).not.toHaveBeenCalled();
  });
});
