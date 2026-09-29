import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { EventsHome } from './components/EventsHome';
import { GroupTab } from './components/GroupTab';
import { ExpensesTab } from './components/ExpensesTab';
import { SettlementTab } from './components/SettlementTab';
import { TabBar, type TabId } from './components/TabBar';
import { selectActiveEvent, selectIsGroupValid, useAppStore } from './store/useAppStore';
import { BACK_TO_EVENTS_LABEL, EVENT_STATUS_LABELS } from './ui/messages';
import { faArrowLeft, faUsers } from './ui/icons';

export function App() {
  const activeEvent = useAppStore(selectActiveEvent);
  const isGroupValid = useAppStore(selectIsGroupValid);
  const closeEvent = useAppStore((state) => state.closeEvent);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-3 py-4 sm:px-4">
      <header className="flex items-center gap-2">
        {activeEvent && (
          <button
            type="button"
            aria-label={BACK_TO_EVENTS_LABEL}
            onClick={closeEvent}
            className="min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-slate-600 hover:bg-slate-100"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        )}
        <FontAwesomeIcon icon={faUsers} className="text-lg text-slate-500" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight">Split</h1>
          <p className="truncate text-sm text-slate-500">
            {activeEvent
              ? `${activeEvent.name} \u00b7 ${EVENT_STATUS_LABELS[activeEvent.status]}`
              : 'Your events'}
          </p>
        </div>
      </header>

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
