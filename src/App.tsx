import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { decodeShare, encodeShare } from './domain/share';
import { EventsHome } from './components/EventsHome';
import { GroupTab } from './components/GroupTab';
import { ExpensesTab } from './components/ExpensesTab';
import { SettlementTab } from './components/SettlementTab';
import { TabBar, type TabId } from './components/TabBar';
import { ThemeControl } from './components/ThemeControl';
import { AppShell } from './components/shell/AppShell';
import { AppBar } from './components/shell/AppBar';
import { usePrefersReducedMotion } from './ui/usePrefersReducedMotion';
import { selectActiveEvent, selectIsActiveEventEditable, selectIsGroupValid, useAppStore } from './store/useAppStore';
import { copyText } from './lib/clipboard';
import { buildShareUrl, readSharePayload } from './lib/shareUrl';
import {
  EVENT_IMPORTED,
  EVENT_STATUS_LABELS,
  INVALID_SHARE_LINK,
  LINK_COPIED,
} from './ui/messages';
import { faShareFromSquare } from './ui/icons';

export function App() {
  const activeEvent = useAppStore(selectActiveEvent);
  const isGroupValid = useAppStore(selectIsGroupValid);
  const isEditable = useAppStore(selectIsActiveEventEditable);
  const closeEvent = useAppStore((state) => state.closeEvent);
  const importEvent = useAppStore((state) => state.importEvent);
  const [message, setMessage] = useState<string | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exiting, setExiting] = useState<{ id: string; name: string; status: string } | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>('group');
  const disabledTabs: TabId[] = isGroupValid ? [] : ['expenses', 'settlement'];

  useEffect(() => {
    setActiveTab('group');
  }, [activeEvent?.id]);

  useEffect(() => {
    if (disabledTabs.includes(activeTab)) setActiveTab('group');
  }, [activeTab, isGroupValid]);

  function handleBack(): void {
    if (activeEvent && !reducedMotion) {
      setExiting({ id: activeEvent.id, name: activeEvent.name, status: EVENT_STATUS_LABELS[activeEvent.status] });
      return;
    }
    closeEvent();
  }

  useEffect(() => {
    if (reducedMotion && exiting) {
      closeEvent();
      setExiting(null);
    }
  }, [reducedMotion, exiting, closeEvent]);

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
    <AppShell
      appBar={<AppBar
        title={activeEvent?.name ?? exiting?.name ?? 'Split'}
        subtitle={activeEvent ? EVENT_STATUS_LABELS[activeEvent.status] : exiting?.status ?? 'Your events'}
        onBack={activeEvent && !exiting ? handleBack : undefined}
        actions={<>
        {activeEvent && !exiting && (
          <button
            type="button"
            aria-label="Share"
            title="Share"
            onClick={shareActiveEvent}
            className="mobile-target md-icon-button shrink-0"
          >
            <FontAwesomeIcon icon={faShareFromSquare} />
          </button>
        )}
        <ThemeControl />
        </>}
      />}
      content={<>
        {message && (
        <p role="status" className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success-fg">
          {message}
        </p>
      )}
      {exiting ? (
        <div className="pointer-events-none animate-pop-out" onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          closeEvent();
          setExiting(null);
        }} data-testid="exiting-screen">
          <EventWorkspace activeTab={activeTab} showPrimaryAction={false} />
        </div>
      ) : activeEvent ? (
        <div key={activeEvent.id} className={reducedMotion ? '' : 'animate-push-in'}>
          <EventWorkspace activeTab={activeTab} />
        </div>
      ) : (
        <EventsHome />
      )}
      </>}
      bottomBar={activeEvent || exiting
        ? <TabBar activeTab={activeTab} disabledTabs={disabledTabs} onSelect={setActiveTab} />
        : undefined}
      hasPrimaryAction={!activeEvent || Boolean(isEditable && activeTab !== 'settlement' && !exiting)}
    />
  );
}

function EventWorkspace({ activeTab, showPrimaryAction = true }: {
  activeTab: TabId;
  showPrimaryAction?: boolean;
}) {
  return (
    <>
      <main className="flex-1">
        {activeTab === 'group' && (
          <section role="tabpanel" id="panel-group" aria-labelledby="tab-group">
            <GroupTab showPrimaryAction={showPrimaryAction} />
          </section>
        )}
        {activeTab === 'expenses' && (
          <section role="tabpanel" id="panel-expenses" aria-labelledby="tab-expenses">
            <ExpensesTab showPrimaryAction={showPrimaryAction} />
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
