import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle2,
  Play,
  Square,
  Volume2,
  Zap,
} from 'lucide-react';
import { AlertPreferences, AlertSoundId, FiredAlertLog, ScheduleItem } from '../types/schedule';
import { formatCountdown, getScheduleDateTime } from '../data/initialData';
import { audioEngine, SOUND_PROFILES } from '../utils/audioEngine';

interface AlertsStudioViewProps {
  schedules: ScheduleItem[];
  alertPrefs: AlertPreferences;
  audioUnlocked: boolean;
  alertLogs: FiredAlertLog[];
  nowMs: number;
  onUnlockAudio: () => Promise<void>;
  onUpdatePrefs: (prefs: AlertPreferences) => void;
  onRequestBrowserNotifications: () => Promise<void>;
  onSchedule10sUrgentTest: () => void;
  onClearLogs: () => void;
}

export function AlertsStudioView({
  schedules,
  alertPrefs,
  audioUnlocked,
  alertLogs,
  nowMs,
  onUnlockAudio,
  onUpdatePrefs,
  onRequestBrowserNotifications,
  onSchedule10sUrgentTest,
  onClearLogs,
}: AlertsStudioViewProps) {
  const [playingSoundId, setPlayingSoundId] = useState<AlertSoundId | null>(null);

  const notificationPermission =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported';

  const upcomingQueue = useMemo(() => {
    return schedules
      .filter((item) => !item.completed && item.audioAlertEnabled)
      .map((item) => {
        const startMs = getScheduleDateTime(item.date, item.startTime).getTime();
        const triggerMs = item.exactTriggerAt ?? startMs - item.alertLeadMinutes * 60_000;
        const effectiveTriggerMs =
          item.snoozedUntil && item.snoozedUntil > nowMs ? item.snoozedUntil : triggerMs;
        return {
          item,
          triggerMs: effectiveTriggerMs,
          remainingMs: effectiveTriggerMs - nowMs,
        };
      })
      .filter((entry) => entry.remainingMs > -60_000)
      .sort((a, b) => a.triggerMs - b.triggerMs);
  }, [schedules, nowMs]);

  const handlePreviewSound = async (soundId: AlertSoundId) => {
    if (playingSoundId === soundId) {
      audioEngine.stopLoop();
      setPlayingSoundId(null);
      return;
    }
    setPlayingSoundId(soundId);
    await audioEngine.playOnce(soundId, alertPrefs.volume);
    window.setTimeout(() => {
      setPlayingSoundId((curr) => (curr === soundId ? null : curr));
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Audio & Notification Readiness Panel */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900">Audio Alert Engine</h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Browsers require one user click to permit automatic sound playback for scheduled
                urgent notifications.
              </p>
            </div>
            <span
              className={`text-xs font-semibold whitespace-nowrap ${
                audioUnlocked ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {audioUnlocked ? 'Audio Armed' : 'Click to Arm'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => void onUnlockAudio()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {audioUnlocked ? 'Verify Audio Playback' : 'Arm Audio Engine'}
            </button>

            <button
              type="button"
              onClick={onSchedule10sUrgentTest}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap"
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Run 10s Urgent Countdown Test
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Desktop System Notifications
                </h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receive an operating-system popup alert alongside the urgent audio sound even when
                switched to another tab.
              </p>
            </div>
            <span
              className={`text-xs font-semibold capitalize whitespace-nowrap ${
                notificationPermission === 'granted' ? 'text-emerald-700' : 'text-slate-600'
              }`}
            >
              {notificationPermission === 'granted' ? 'Enabled' : notificationPermission}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => void onRequestBrowserNotifications()}
              disabled={notificationPermission === 'unsupported'}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              {notificationPermission === 'granted'
                ? 'Notifications Permitted'
                : 'Enable Desktop Notifications'}
            </button>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={alertPrefs.repeatUrgentUntilDismissed}
                onChange={(e) =>
                  onUpdatePrefs({
                    ...alertPrefs,
                    repeatUrgentUntilDismissed: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              Repeat urgent audio until acknowledged
            </label>
          </div>
        </div>
      </section>

      {/* Sound Profiles & Volume Studio */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 px-6 py-4 bg-slate-50/70">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Urgent & Important Audio Sound Profiles
            </h2>
            <p className="text-xs text-slate-500">
              Synthesized locally with Web Audio API so urgent alerts never fail to play.
            </p>
          </div>

          <div className="flex items-center gap-3 min-w-[220px]">
            <label htmlFor="master-volume" className="text-xs font-medium text-slate-700 shrink-0">
              Master Volume
            </label>
            <input
              id="master-volume"
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={alertPrefs.volume}
              onChange={(e) =>
                onUpdatePrefs({ ...alertPrefs, volume: Number(e.target.value) })
              }
              className="w-full accent-blue-600"
            />
            <span className="text-xs font-mono tabular-nums text-slate-700 w-10 text-right">
              {Math.round(alertPrefs.volume * 100)}%
            </span>
          </div>
        </div>

        <ul className="divide-y divide-slate-200">
          {SOUND_PROFILES.map((profile) => {
            const isUrgentDefault = alertPrefs.defaultUrgentSound === profile.id;
            const isImportantDefault = alertPrefs.defaultImportantSound === profile.id;
            const isPlaying = playingSoundId === profile.id;

            return (
              <li
                key={profile.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-4 hover:bg-slate-50/70"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{profile.name}</h3>
                    {isUrgentDefault && (
                      <span className="text-xs font-semibold text-red-600">
                        · Default for Urgent
                      </span>
                    )}
                    {isImportantDefault && (
                      <span className="text-xs font-semibold text-amber-700">
                        · Default for Important
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {profile.character} · {profile.recommendedFor} ·{' '}
                    <span className="font-mono text-slate-600">{profile.patternSummary}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handlePreviewSound(profile.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      isPlaying
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Square className="h-3 w-3" aria-hidden="true" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" aria-hidden="true" />
                        Play Preview
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePrefs({ ...alertPrefs, defaultUrgentSound: profile.id })
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      isUrgentDefault
                        ? 'border-red-600 bg-red-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isUrgentDefault ? 'Urgent Default' : 'Set Urgent'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdatePrefs({ ...alertPrefs, defaultImportantSound: profile.id })
                    }
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      isImportantDefault
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {isImportantDefault ? 'Important Default' : 'Set Important'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Live Queue & Alert Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900">Armed Alert Queue</h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {upcomingQueue.length} active
            </span>
          </div>

          {upcomingQueue.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No pending audio alerts queued right now.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {upcomingQueue.slice(0, 6).map(({ item, remainingMs }) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span
                        className={
                          item.priority === 'urgent'
                            ? 'font-semibold text-red-600'
                            : item.priority === 'important'
                            ? 'font-semibold text-amber-700'
                            : ''
                        }
                      >
                        {item.priority === 'urgent'
                          ? 'Urgent'
                          : item.priority === 'important'
                          ? 'Important'
                          : 'Standard'}
                      </span>{' '}
                      · Starts {item.startTime} ({item.alertLeadMinutes}m lead)
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold font-mono tabular-nums text-blue-600">
                      {remainingMs > 0 ? formatCountdown(remainingMs) : 'Due now'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50/70">
            <h2 className="text-sm font-semibold text-slate-900">Recent Alert History</h2>
            {alertLogs.length > 0 && (
              <button
                type="button"
                onClick={onClearLogs}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Clear History
              </button>
            )}
          </div>

          {alertLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Triggered alerts and acknowledgments will appear here.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 max-h-[320px] overflow-y-auto">
              {alertLogs.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {log.priority === 'urgent' && (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" aria-hidden="true" />
                      )}
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {log.scheduleTitle}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                      {new Date(log.firedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      · {log.soundId}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold capitalize shrink-0 ${
                      log.status === 'active'
                        ? 'text-red-600'
                        : log.status === 'snoozed'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {log.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
