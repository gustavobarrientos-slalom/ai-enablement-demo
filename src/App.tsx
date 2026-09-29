import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { decodeShare, encodeShare } from './domain/share';
import { EventsHome } from './components/EventsHome';
import { GroupTab } from './components/GroupTab';
import { ExpensesTab } from './components/ExpensesTab';
import { SettlementTab } from './components/SettlementTab';
import { TabBar, type TabId } from './components/TabBar';
import { ThemeControl } from './components/ThemeControl';
import { selectActiveEvent, selectIsGroupValid, useAppStore } from './store/useAppStore';
import { copyText } from './lib/clipboard';
import { buildShareUrl, readSharePayload } from './lib/shareUrl';
import {
  BACK_TO_EVENTS_LABEL,
  EVENT_IMPORTED,
  EVENT_STATUS_LABELS,
  INVALID_SHARE_LINK,
  LINK_COPIED,
} from './ui/messages';
import { faArrowLeft, faShareFromSquare, faUsers } from './ui/icons';

export function App() {
  const activeEvent = useAppStore(selectActiveEvent);
  const isGroupValid = useAppStore(selectIsGroupValid);
  const closeEvent = useAppStore((state) => state.closeEvent);
  const importEvent = useAppStore((state) => state.importEvent);
  const [message, setMessage] = useState<string | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showMessage(nextMessage: string): void {
    if (messageTimer.current !== null) {
      clearTimeout(messageTimer.current);
    }

    setMessage(nextMessage);
    messageTimer.current = setTimeout(() => setMessage(null), 2500);
  }

  useEffect(() => {
    const payload = readSharePayload(window.location.hash);

    if (payload === null) {
      return;
    }

    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    );

    const decoded = decodeShare(payload);

    if (!decoded.ok || !importEvent(decoded.value)) {
      showMessage(INVALID_SHARE_LINK);
      return;
    }

    showMessage(EVENT_IMPORTED);
  }, [importEvent]);

  useEffect(
    () => () => {
      if (messageTimer.current !== null) {
        clearTimeout(messageTimer.current);
      }
    },
    [],
  );

  async function shareActiveEvent(): Promise<void> {
    if (!activeEvent) {
      return;
    }

    const url = buildShareUrl(
      window.location.origin,
      window.location.pathname,
      encodeShare(activeEvent),
    );

    if (await copyText(url)) {
      showMessage(LINK_COPIED);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-3 py-4 sm:px-4">
      <header className="flex items-center gap-2">
        {activeEvent && (
          <button
            type="button"
            aria-label={BACK_TO_EVENTS_LABEL}
            onClick={closeEvent}
            className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-text-muted hover:bg-surface-muted"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        )}
        <FontAwesomeIcon icon={faUsers} className="text-lg text-text-muted" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight">Split</h1>
          <p className="truncate text-sm text-text-muted">
            {activeEvent
              ? `${activeEvent.name} \u00b7 ${EVENT_STATUS_LABELS[activeEvent.status]}`
              : 'Your events'}
          </p>
        </div>
        {activeEvent && (
          <button
            type="button"
            onClick={shareActiveEvent}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium text-text-muted hover:bg-surface-muted"
          >
            <FontAwesomeIcon icon={faShareFromSquare} />
            Share
          </button>
        )}
        <ThemeControl />
      </header>

      {message && (
        <p role="status" className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success-fg">
          {message}
        </p>
      )}

      {activeEvent ? (
        // Keyed by event id so per-tab drafts never leak between events.
        <EventWorkspace key={activeEvent.id} isGroupValid={isGroupValid} />
      ) : (
        <main className="flex-1">
          <EventsHome />
        </main>
      )}
    </div>
  );
}

function EventWorkspace({ isGroupValid }: { isGroupValid: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>('group');

  const disabledTabs: TabId[] = isGroupValid ? [] : ['expenses', 'settlement'];

  // Never leave a tab active once it becomes disabled.
  useEffect(() => {
    if (disabledTabs.includes(activeTab)) {
      setActiveTab('group');
    }
  }, [activeTab, isGroupValid]);

  return (
    <>
      <TabBar activeTab={activeTab} disabledTabs={disabledTabs} onSelect={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'group' && (
          <section role="tabpanel" id="panel-group" aria-labelledby="tab-group">
            <GroupTab />
          </section>
        )}
        {activeTab === 'expenses' && (
          <section role="tabpanel" id="panel-expenses" aria-labelledby="tab-expenses">
            <ExpensesTab />
          </section>
        )}
        {activeTab === 'settlement' && (
          <section role="tabpanel" id="panel-settlement" aria-labelledby="tab-settlement">
            <SettlementTab />
          </section>
        )}
      </main>
    </>
  );
}
