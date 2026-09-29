import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { faChevronRight } from '../../ui/icons';

interface ListRowProps {
  icon: IconDefinition;
  primary: ReactNode;
  secondary?: ReactNode;
  amount?: ReactNode;
  trailing?: ReactNode;
  actions?: readonly { label: string; text: string; icon: IconDefinition; onClick: () => void; destructive?: boolean }[];
  onSelect?: () => void;
  children?: ReactNode;
  testId?: string;
}

export function ListRow({ icon, primary, secondary, amount, trailing, actions, onSelect, children, testId }: ListRowProps) {
  const [revealed, setRevealed] = useState(false);
  const [dragDistance, setDragDistance] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const selectButton = useRef<HTMLButtonElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const actionWidth = 80 * (actions?.length ?? 0);
  const hasActions = actionWidth > 0;

  useEffect(() => {
    if (!hasActions) {
      start.current = null;
      setDragDistance(null);
      setRevealed(false);
    }
  }, [hasActions]);

  function moveSwipe(x: number, y: number) {
    if (!start.current || !hasActions) return;
    const dx = x - start.current.x;
    const dy = y - start.current.y;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setDragDistance(Math.max(0, Math.min(actionWidth, (revealed ? actionWidth : 0) - dx)));
    }
  }

  function finishSwipe(x: number, y: number) {
    if (!start.current) return;
    const dx = x - start.current.x;
    const dy = y - start.current.y;
    start.current = null;
    setDragDistance(null);
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setRevealed(dx < 0);
      suppressClick.current = true;
    }
  }

  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
        <FontAwesomeIcon icon={icon} className="w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-medium">{primary}</span>
        {secondary && <span className="block text-xs text-text-muted">{secondary}</span>}
      </span>
      {amount && <span className="shrink-0 text-base font-semibold">{amount}</span>}
      {onSelect && <FontAwesomeIcon icon={faChevronRight} aria-label="Open" className="text-text-muted" />}
    </>
  );

  return (
    <li data-testid={testId} className={`min-h-11 bg-surface${hasActions ? ' relative overflow-hidden' : ''}`}>
      <div
        ref={row}
        role={hasActions && !onSelect ? 'group' : undefined}
        aria-label={hasActions && !onSelect ? `${actions![0]!.label} row` : undefined}
        aria-description={hasActions && !onSelect ? 'Swipe left or press Left Arrow to reveal actions' : undefined}
        tabIndex={hasActions && !onSelect ? 0 : undefined}
        className={hasActions
          ? `relative z-10 bg-surface ${dragDistance === null ? 'transition-transform duration-200 ease-out motion-reduce:transition-none' : ''}`
          : onSelect ? 'contents' : 'flex min-h-11 items-center gap-3 px-4 py-3'}
        style={hasActions ? {
          touchAction: 'pan-y',
          transform: `translateX(${-(dragDistance ?? (revealed ? actionWidth : 0)) || 0}px)`,
        } : undefined}
        onPointerDown={hasActions ? (event) => {
          if (event.pointerType === 'touch') return;
          suppressClick.current = false;
          start.current = { x: event.clientX, y: event.clientY };
        } : undefined}
        onPointerMove={hasActions ? (event) => {
          if (event.pointerType !== 'touch') {
            const dx = event.clientX - (start.current?.x ?? event.clientX);
            const dy = event.clientY - (start.current?.y ?? event.clientY);
            if (start.current && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }
            moveSwipe(event.clientX, event.clientY);
          }
        } : undefined}
        onPointerUp={hasActions ? (event) => {
          if (event.pointerType !== 'touch') finishSwipe(event.clientX, event.clientY);
        } : undefined}
        onPointerCancel={hasActions ? (event) => {
          if (event.pointerType !== 'touch') { start.current = null; setDragDistance(null); }
        } : undefined}
        onTouchStart={hasActions ? (event) => {
          const touch = event.touches[0];
          if (touch) {
            suppressClick.current = false;
            start.current = { x: touch.clientX, y: touch.clientY };
          }
        } : undefined}
        onTouchMove={hasActions ? (event) => {
          const touch = event.touches[0];
          if (touch) moveSwipe(touch.clientX, touch.clientY);
        } : undefined}
        onTouchEnd={hasActions ? (event) => {
          const touch = event.changedTouches[0];
          if (touch) finishSwipe(touch.clientX, touch.clientY);
        } : undefined}
        onTouchCancel={hasActions ? () => { start.current = null; setDragDistance(null); } : undefined}
        onKeyDown={hasActions ? (event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); setRevealed(true); }
          if (event.key === 'ArrowRight' || event.key === 'Escape') { setRevealed(false); }
        } : undefined}
      >
        {onSelect ? (
          <button
            ref={selectButton}
            type="button"
            onClick={() => {
              if (suppressClick.current) { suppressClick.current = false; return; }
              if (revealed) { setRevealed(false); return; }
              onSelect();
            }}
            aria-description={hasActions ? 'Swipe left or press Left Arrow to reveal actions' : undefined}
            className="mobile-target flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
          >
            {inner}
          </button>
        ) : hasActions ? <div className="flex min-h-11 items-center gap-3 px-4 py-3">{inner}{trailing}</div> : <>{inner}{trailing}</>}
      </div>
      {hasActions && (
        <div className="absolute inset-y-0 right-0 flex" aria-hidden={!revealed}>
          {actions!.map((action) => (
            <button
              key={action.label}
              type="button"
              aria-label={action.label}
              tabIndex={revealed ? 0 : -1}
              onClick={() => {
                setRevealed(false);
                action.onClick();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape' || event.key === 'ArrowRight') {
                  setRevealed(false);
                  (selectButton.current ?? row.current)?.focus();
                }
              }}
              className={`mobile-target flex w-20 flex-col items-center justify-center gap-1 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset ${action.destructive ? 'bg-red-700 text-white focus-visible:outline-white' : 'bg-surface-muted text-text focus-visible:outline-primary'}`}
            >
              <FontAwesomeIcon icon={action.icon} />
              {action.text}
            </button>
          ))}
        </div>
      )}
      {children}
    </li>
  );
}
