import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellOff,
  BellRing,
  Calendar,
  Check,
  Edit3,
  Plus,
  Search,
  Trash2,
  Users,
  Volume2,
  Zap,
} from 'lucide-react';
import { ScheduleItem } from '../types/schedule';
import {
  formatCountdown,
  formatDurationLabel,
  formatLocalDateISO,
  getDurationMinutes,
  getScheduleDateTime,
} from '../data/initialData';

interface ScheduleViewProps {
  mode: 'today' | 'upcoming';
  schedules: ScheduleItem[];
  nowMs: number;
  onToggleComplete: (id: string) => void;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  onTestAlertItem: (item: ScheduleItem) => void;
  onSchedule10sUrgentTest: () => void;
  onOpenMeeting: (id: string) => void;
}

type FilterTab = 'all' | 'urgent' | 'meetings' | 'completed';

export function ScheduleView({
  mode,
  schedules,
  nowMs,
  onToggleComplete,
  onEdit,
  onDelete,
  onCreateNew,
  onTestAlertItem,
  onSchedule10sUrgentTest,
  onOpenMeeting,
}: ScheduleViewProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const todayISO = formatLocalDateISO(new Date(nowMs));

  const scopedSchedules = useMemo(() => {
    const base =
      mode === 'today'
        ? schedules.filter((item) => item.date === todayISO)
        : schedules.filter((item) => item.date >= todayISO);

    return [...base].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
  }, [schedules, mode, todayISO]);

  const filteredSchedules = useMemo(() => {
    return scopedSchedules.filter((item) => {
      if (filter === 'urgent' && item.priority !== 'urgent' && item.priority !== 'important') {
        return false;
      }
      if (filter === 'meetings' && item.category !== 'meeting') {
        return false;
      }
      if (filter === 'completed' && !item.completed) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        const matchLoc = (item.locationOrLink || '').toLowerCase().includes(q);
        return matchTitle || matchNotes || matchLoc;
      }
      return true;
    });
  }, [scopedSchedules, filter, searchQuery]);

  const metrics = useMemo(() => {
    const totalCount = scopedSchedules.length;
    const completedCount = scopedSchedules.filter((s) => s.completed).length;
    const meetingItems = scopedSchedules.filter((s) => s.category === 'meeting');
    const meetingMinutes = meetingItems.reduce(
      (acc, m) => acc + getDurationMinutes(m.startTime, m.endTime),
      0
    );
    const armedUrgentCount = scopedSchedules.filter(
      (s) => !s.completed && s.audioAlertEnabled && (s.priority === 'urgent' || s.priority === 'important')
    ).length;

    let nextAlertMs: number | null = null;
    let nextAlertTitle = 'None scheduled';
    for (const item of scopedSchedules) {
      if (item.completed) continue;
      const startMs = getScheduleDateTime(item.date, item.startTime).getTime();
      const triggerMs =
        item.exactTriggerAt ??
        (item.audioAlertEnabled ? startMs - item.alertLeadMinutes * 60_000 : startMs);
      const targetMs = item.snoozedUntil && item.snoozedUntil > nowMs ? item.snoozedUntil : triggerMs;
      if (targetMs > nowMs && (nextAlertMs === null || targetMs < nextAlertMs)) {
        nextAlertMs = targetMs;
        nextAlertTitle = item.title;
      }
    }

    return {
      totalCount,
      completedCount,
      meetingCount: meetingItems.length,
      meetingDuration: formatDurationLabel(meetingMinutes),
      armedUrgentCount,
      nextCountdown: nextAlertMs ? formatCountdown(nextAlertMs - nowMs) : '--:--',
      nextAlertTitle,
    };
  }, [scopedSchedules, nowMs]);

  return (
    <div className="space-y-6">
      {/* Top 4-column summary strip: single flat surface with hairline vertical dividers */}
      <section
        aria-label="Schedule Summary"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 rounded-xl border border-slate-200 bg-white divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
      >
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">
            {mode === 'today' ? "Today's Blocks" : 'Upcoming Blocks'}
          </p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {metrics.totalCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {metrics.completedCount} completed · {metrics.totalCount - metrics.completedCount} remaining
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Organized Meetings</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {metrics.meetingCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
            {metrics.meetingDuration} total meeting time
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Audio Alerts Armed</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-slate-900">
            {metrics.armedUrgentCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Urgent & important monitors</p>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Next Scheduled Alert</p>
          <p className="mt-1.5 text-2xl font-semibold font-mono tabular-nums text-blue-600">
            {metrics.nextCountdown}
          </p>
          <p className="mt-1 text-xs text-slate-500 truncate" title={metrics.nextAlertTitle}>
            {metrics.nextAlertTitle}
          </p>
        </div>
      </section>

      {/* Toolbar: Filter segmented controls + Search + Urgent 10s Live Test */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            {(
              [
                { id: 'all', label: 'All Blocks' },
                { id: 'urgent', label: 'Urgent & Important' },
                { id: 'meetings', label: 'Meetings' },
                { id: 'completed', label: 'Completed' },
              ] as { id: FilterTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schedule..."
              aria-label="Search schedule"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onSchedule10sUrgentTest}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            Schedule 10s Urgent Test
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Schedule Block
          </button>
        </div>
      </div>

      {/* Main Chronological Timeline List */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50/70">
          <h2 className="text-sm font-semibold text-slate-900">
            {mode === 'today' ? 'Daily Timeline' : 'Full Upcoming Schedule'}
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {filteredSchedules.length} {filteredSchedules.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-slate-900">No schedule items match</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Add a new time block or meeting with custom urgent audio alerts, or clear your current
              filters.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Create Schedule Block
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {filteredSchedules.map((item) => {
              const startMs = getScheduleDateTime(item.date, item.startTime).getTime();
              const endMs = getScheduleDateTime(item.date, item.endTime).getTime();
              const isInProgress = !item.completed && nowMs >= startMs && nowMs <= endMs;
              const isUrgent = item.priority === 'urgent';
              const isImportant = item.priority === 'important';
              const duration = getDurationMinutes(item.startTime, item.endTime);

              return (
                <li
                  key={item.id}
                  className={`group flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-5 py-4 transition-colors ${
                    isInProgress
                      ? 'bg-blue-50/50'
                      : isUrgent && !item.completed
                      ? 'bg-red-50/25 hover:bg-red-50/45'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleComplete(item.id)}
                      aria-label={
                        item.completed ? `Mark "${item.title}" incomplete` : `Mark "${item.title}" complete`
                      }
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                        item.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-300 text-transparent hover:border-slate-400'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <div className="w-28 shrink-0 pt-0.5">
                      <p className="text-xs font-semibold font-mono tabular-nums text-slate-900">
                        {item.startTime} – {item.endTime}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                        {mode === 'upcoming' ? `${item.date} · ` : ''}
                        {formatDurationLabel(duration)}
                      </p>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-sm font-semibold truncate ${
                            item.completed ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </h3>
                        {isInProgress && (
                          <span className="text-xs font-semibold text-blue-700">In Progress</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span className="capitalize font-medium text-slate-700">
                          {item.category}
                        </span>
                        <span aria-hidden="true">·</span>

                        {isUrgent ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            Urgent
                          </span>
                        ) : isImportant ? (
                          <span className="font-semibold text-amber-700">Important</span>
                        ) : (
                          <span>Standard</span>
                        )}

                        <span aria-hidden="true">·</span>

                        {item.audioAlertEnabled ? (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <BellRing className="h-3 w-3 text-blue-600" aria-hidden="true" />
                            {item.alertLeadMinutes === 0
                              ? 'Audio at start'
                              : `Audio ${item.alertLeadMinutes}m prior`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <BellOff className="h-3 w-3" aria-hidden="true" />
                            Audio muted
                          </span>
                        )}

                        {item.category === 'meeting' && item.attendees.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" aria-hidden="true" />
                              {item.attendees.length} attendees
                            </span>
                          </>
                        )}

                        {item.locationOrLink && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[240px]">{item.locationOrLink}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 pl-10 lg:pl-0">
                    {item.category === 'meeting' && (
                      <button
                        type="button"
                        onClick={() => onOpenMeeting(item.id)}
                        className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-white border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors whitespace-nowrap shrink-0"
                      >
                        Organize Meeting
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onTestAlertItem(item)}
                      title="Play this schedule item's alert sound and notification now"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Trigger Alert
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      aria-label={`Edit ${item.title}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      aria-label={`Delete ${item.title}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
