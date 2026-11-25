import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BellRing,
  Calendar,
  CalendarDays,
  Menu,
  Plus,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import {
  AlertPreferences,
  AlertSoundId,
  FiredAlertLog,
  ScheduleCategory,
  ScheduleItem,
  ViewMode,
} from './types/schedule';
import {
  addMinutesToDate,
  buildInitialSchedules,
  DEFAULT_ALERT_PREFERENCES,
  formatLocalDateISO,
  formatTimeHHMM,
  getScheduleDateTime,
} from './data/initialData';
import { audioEngine } from './utils/audioEngine';
import { UrgentAlertBanner } from './components/UrgentAlertBanner';
import { ScheduleModal } from './components/ScheduleModal';
import { ScheduleView } from './components/ScheduleView';
import { MeetingsView } from './components/MeetingsView';
import { AlertsStudioView } from './components/AlertsStudioView';

const STORAGE_KEYS = {
  SCHEDULES: 'cadence_schedules_v1',
  PREFS: 'cadence_alert_prefs_v1',
  LOGS: 'cadence_alert_logs_v1',
};

function loadInitialSchedules(): ScheduleItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    if (raw) {
      const parsed = JSON.parse(raw) as ScheduleItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return buildInitialSchedules(new Date());
}

function loadInitialPrefs(): AlertPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PREFS);
    if (raw) {
      return { ...DEFAULT_ALERT_PREFERENCES, ...(JSON.parse(raw) as Partial<AlertPreferences>) };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_ALERT_PREFERENCES;
}

function loadInitialLogs(): FiredAlertLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (raw) {
      const parsed = JSON.parse(raw) as FiredAlertLog[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export default function App() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(loadInitialSchedules);
  const [alertPrefs, setAlertPrefs] = useState<AlertPreferences>(loadInitialPrefs);
  const [alertLogs, setAlertLogs] = useState<FiredAlertLog[]>(loadInitialLogs);

  const [view, setView] = useState<ViewMode>('today');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [modalDefaultCategory, setModalDefaultCategory] = useState<ScheduleCategory>('meeting');

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(
    () => audioEngine.getState() === 'unlocked'
  );
  const [activeAlertItem, setActiveAlertItem] = useState<ScheduleItem | null>(null);
  const [isAlertLooping, setIsAlertLooping] = useState(false);

  const schedulesRef = useRef(schedules);
  schedulesRef.current = schedules;

  const prefsRef = useRef(alertPrefs);
  prefsRef.current = alertPrefs;

  const activeAlertRef = useRef(activeAlertItem);
  activeAlertRef.current = activeAlertItem;

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
    } catch {
      // ignore quota errors
    }
  }, [schedules]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(alertPrefs));
    } catch {
      // ignore quota errors
    }
  }, [alertPrefs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(alertLogs.slice(0, 50)));
    } catch {
      // ignore quota errors
    }
  }, [alertLogs]);

  // Silently unlock Web Audio on first user interaction anywhere in the app
  useEffect(() => {
    const handleFirstInteraction = async () => {
      const ok = await audioEngine.unlock();
      if (ok) {
        setAudioUnlocked(true);
      }
    };
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const triggerAlertForItem = useCallback((item: ScheduleItem, isManualPreview = false) => {
    const prefs = prefsRef.current;
    const soundToPlay: AlertSoundId =
      item.soundId ||
      (item.priority === 'urgent' ? prefs.defaultUrgentSound : prefs.defaultImportantSound);

    const shouldLoop = item.priority === 'urgent' && prefs.repeatUrgentUntilDismissed;

    setActiveAlertItem({ ...item, soundId: soundToPlay });
    setIsAlertLooping(shouldLoop);

    if (shouldLoop) {
      void audioEngine.startUrgentLoop(soundToPlay, prefs.volume).then((played) => {
        if (played) setAudioUnlocked(true);
      });
    } else {
      void audioEngine.playOnce(soundToPlay, prefs.volume).then((played) => {
        if (played) setAudioUnlocked(true);
      });
    }

    if (
      !isManualPreview &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(
          item.priority === 'urgent'
            ? `URGENT: ${item.title}`
            : `Upcoming Schedule: ${item.title}`,
          {
            body: `${item.startTime} – ${item.endTime}${
              item.locationOrLink ? ` · ${item.locationOrLink}` : ''
            }`,
            tag: `cadence-${item.id}`,
          }
        );
      } catch {
        // ignore browser notification constraints
      }
    }

    const logEntry: FiredAlertLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      scheduleId: item.id,
      scheduleTitle: item.title,
      priority: item.priority,
      soundId: soundToPlay,
      firedAt: Date.now(),
      status: 'active',
    };
    setAlertLogs((prev) => [logEntry, ...prev].slice(0, 50));
  }, []);

  // Second-by-second real-time clock & alert monitor
  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentMs = Date.now();
      setNowMs(currentMs);

      const currentSchedules = schedulesRef.current;
      let updatedAny = false;
      let itemToFire: ScheduleItem | null = null;

      const nextSchedules = currentSchedules.map((item) => {
        if (item.completed || !item.audioAlertEnabled || item.acknowledged) {
          return item;
        }

        const startMs = getScheduleDateTime(item.date, item.startTime).getTime();
        const scheduledTriggerMs =
          item.exactTriggerAt ?? startMs - item.alertLeadMinutes * 60_000;
        const effectiveTriggerMs =
          item.snoozedUntil && item.snoozedUntil > scheduledTriggerMs
            ? item.snoozedUntil
            : scheduledTriggerMs;

        // Fire if we are within a 60-second window at or past trigger time and haven't triggered for this target yet
        const alreadyTriggeredThisTarget =
          item.triggeredAt !== undefined && item.triggeredAt >= effectiveTriggerMs;

        if (
          !alreadyTriggeredThisTarget &&
          currentMs >= effectiveTriggerMs &&
          currentMs - effectiveTriggerMs <= 60_000
        ) {
          updatedAny = true;
          const marked: ScheduleItem = {
            ...item,
            triggeredAt: currentMs,
            snoozedUntil: undefined,
            exactTriggerAt: undefined,
          };
          if (!itemToFire) {
            itemToFire = marked;
          }
          return marked;
        }

        return item;
      });

      if (updatedAny) {
        setSchedules(nextSchedules);
      }
      if (itemToFire) {
        triggerAlertForItem(itemToFire, false);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [triggerAlertForItem]);

  const handleUnlockAudio = async () => {
    const ok = await audioEngine.unlock();
    setAudioUnlocked(ok);
    if (ok) {
      await audioEngine.playOnce(alertPrefs.defaultImportantSound, alertPrefs.volume * 0.65);
    }
  };

  const handleRequestBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setAlertPrefs((prev) => ({
        ...prev,
        browserNotificationsEnabled: result === 'granted',
      }));
    } catch {
      // ignore
    }
  };

  const handleAcknowledgeAlert = () => {
    audioEngine.stopLoop();
    setIsAlertLooping(false);
    const current = activeAlertRef.current;
    if (current) {
      setSchedules((prev) =>
        prev.map((s) => (s.id === current.id ? { ...s, acknowledged: true } : s))
      );
      setAlertLogs((prev) =>
        prev.map((log, idx) =>
          idx === 0 && log.scheduleId === current.id ? { ...log, status: 'acknowledged' } : log
        )
      );
    }
    setActiveAlertItem(null);
  };

  const handleSnoozeAlert = (minutes: number) => {
    audioEngine.stopLoop();
    setIsAlertLooping(false);
    const current = activeAlertRef.current;
    if (current) {
      const snoozeTarget = Date.now() + minutes * 60_000;
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === current.id
            ? { ...s, snoozedUntil: snoozeTarget, acknowledged: false }
            : s
        )
      );
      setAlertLogs((prev) =>
        prev.map((log, idx) =>
          idx === 0 && log.scheduleId === current.id ? { ...log, status: 'snoozed' } : log
        )
      );
    }
    setActiveAlertItem(null);
  };

  const handleReplayBannerSound = () => {
    const current = activeAlertRef.current;
    if (!current) return;
    const soundId = current.soundId || alertPrefs.defaultUrgentSound;
    void audioEngine.playOnce(soundId, alertPrefs.volume);
  };

  const handleToggleComplete = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    if (activeAlertItem?.id === id) {
      handleAcknowledgeAlert();
    }
  };

  const handleSaveSchedule = (item: ScheduleItem) => {
    setSchedules((prev) => {
      const exists = prev.some((s) => s.id === item.id);
      if (exists) {
        return prev.map((s) => (s.id === item.id ? item : s));
      }
      return [...prev, item];
    });
    if (item.category === 'meeting') {
      setSelectedMeetingId(item.id);
    }
  };

  const handleSchedule10sUrgentTest = async () => {
    const ok = await audioEngine.unlock();
    if (ok) setAudioUnlocked(true);

    const now = new Date();
    const triggerMs = now.getTime() + 10_000;
    const start = addMinutesToDate(now, 1);
    const end = addMinutesToDate(now, 16);

    const testItem: ScheduleItem = {
      id: `sched-urgent-test-${now.getTime()}`,
      title: 'Urgent Executive Check-In (Live 10s Alert Test)',
      date: formatLocalDateISO(now),
      startTime: formatTimeHHMM(start),
      endTime: formatTimeHHMM(end),
      category: 'meeting',
      priority: 'urgent',
      audioAlertEnabled: true,
      alertLeadMinutes: 0,
      soundId: alertPrefs.defaultUrgentSound,
      completed: false,
      locationOrLink: 'https://meet.cadence.app/urgent-sync',
      notes: 'Triggered automatically to verify urgent audio alerts and notification controls.',
      attendees: [
        { id: 'test-a1', name: 'Claire Sterling', role: 'VP Operations', confirmed: true },
      ],
      agenda: [
        { id: 'test-ag1', topic: 'Immediate escalation decision', durationMinutes: 15, owner: 'You', completed: false },
      ],
      actionItems: [],
      exactTriggerAt: triggerMs,
      acknowledged: false,
    };

    setSchedules((prev) => [...prev, testItem]);
  };

  const openCreateModal = (defaultCat: ScheduleCategory = 'meeting') => {
    setEditingItem(null);
    setModalDefaultCategory(defaultCat);
    setModalOpen(true);
  };

  const openEditModal = (item: ScheduleItem) => {
    setEditingItem(item);
    setModalDefaultCategory(item.category);
    setModalOpen(true);
  };

  const openMeetingOrganizer = (id: string) => {
    setSelectedMeetingId(id);
    setView('meetings');
  };

  const formattedClock = useMemo(() => {
    const d = new Date(nowMs);
    const dateLabel = d.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeLabel = d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    return `${dateLabel} · ${timeLabel}`;
  }, [nowMs]);

  const viewTitleMap: Record<ViewMode, string> = {
    today: "Today's Schedule",
    meetings: 'Meeting Organizer',
    alerts: 'Urgent Audio & Alerts',
    upcoming: 'Upcoming Schedule',
  };

  const navItems: { id: ViewMode; label: string; icon: typeof Calendar }[] = [
    { id: 'today', label: "Today's Schedule", icon: Calendar },
    { id: 'meetings', label: 'Meetings', icon: Users },
    { id: 'alerts', label: 'Urgent Alerts', icon: BellRing },
    { id: 'upcoming', label: 'Upcoming Week', icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar (256px desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200">
            <a
              href="#today"
              onClick={(e) => {
                e.preventDefault();
                setView('today');
                setMobileNavOpen(false);
              }}
              className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
            >
              Cadence
            </a>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Main Navigation" className="p-4 space-y-1">
            {navItems.map((nav) => {
              const Icon = nav.icon;
              const isActive = view === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => {
                    setView(nav.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{nav.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Audio Engine Control */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Urgent Audio</span>
              <span
                className={`text-xs font-medium ${
                  audioUnlocked ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {audioUnlocked ? 'Armed' : 'Standby'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-snug">
              {audioUnlocked
                ? 'Browser audio is ready to sound urgent alerts automatically.'
                : 'Click below once to enable automatic urgent sound alerts.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleUnlockAudio()}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200/70 transition-colors whitespace-nowrap"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            {audioUnlocked ? 'Test Urgent Chime' : 'Arm Audio Alerts'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, concise live clock + 1 primary CTA on right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline">Workspace</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">{viewTitleMap[view]}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <time
              dateTime={new Date(nowMs).toISOString()}
              className="hidden sm:block text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap shrink-0"
            >
              {formattedClock}
            </time>

            <button
              type="button"
              onClick={() => openCreateModal(view === 'meetings' ? 'meeting' : 'focus')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New Schedule
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1280px] w-full mx-auto space-y-6">
          {/* Active Urgent Alert Banner */}
          {activeAlertItem && (
            <UrgentAlertBanner
              item={activeAlertItem}
              isLooping={isAlertLooping}
              onAcknowledge={handleAcknowledgeAlert}
              onSnooze={handleSnoozeAlert}
              onReplaySound={handleReplayBannerSound}
              onOpenMeeting={openMeetingOrganizer}
            />
          )}

          {view === 'today' && (
            <ScheduleView
              mode="today"
              schedules={schedules}
              nowMs={nowMs}
              onToggleComplete={handleToggleComplete}
              onEdit={openEditModal}
              onDelete={handleDeleteSchedule}
              onCreateNew={() => openCreateModal('focus')}
              onTestAlertItem={(item) => triggerAlertForItem(item, true)}
              onSchedule10sUrgentTest={() => void handleSchedule10sUrgentTest()}
              onOpenMeeting={openMeetingOrganizer}
            />
          )}

          {view === 'upcoming' && (
            <ScheduleView
              mode="upcoming"
              schedules={schedules}
              nowMs={nowMs}
              onToggleComplete={handleToggleComplete}
              onEdit={openEditModal}
              onDelete={handleDeleteSchedule}
              onCreateNew={() => openCreateModal('meeting')}
              onTestAlertItem={(item) => triggerAlertForItem(item, true)}
              onSchedule10sUrgentTest={() => void handleSchedule10sUrgentTest()}
              onOpenMeeting={openMeetingOrganizer}
            />
          )}

          {view === 'meetings' && (
            <MeetingsView
              schedules={schedules}
              selectedMeetingId={selectedMeetingId}
              onSelectMeeting={setSelectedMeetingId}
              onUpdateMeeting={handleSaveSchedule}
              onEditMeetingModal={openEditModal}
              onCreateNewMeeting={() => openCreateModal('meeting')}
              onTestAlertItem={(item) => triggerAlertForItem(item, true)}
            />
          )}

          {view === 'alerts' && (
            <AlertsStudioView
              schedules={schedules}
              alertPrefs={alertPrefs}
              audioUnlocked={audioUnlocked}
              alertLogs={alertLogs}
              nowMs={nowMs}
              onUnlockAudio={handleUnlockAudio}
              onUpdatePrefs={setAlertPrefs}
              onRequestBrowserNotifications={handleRequestBrowserNotifications}
              onSchedule10sUrgentTest={() => void handleSchedule10sUrgentTest()}
              onClearLogs={() => setAlertLogs([])}
            />
          )}
        </main>
      </div>

      {/* Create / Edit Modal */}
      <ScheduleModal
        isOpen={modalOpen}
        initialItem={editingItem}
        defaultCategory={modalDefaultCategory}
        alertPrefs={alertPrefs}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveSchedule}
      />
    </div>
  );
}
