import { BellRing, Clock, ExternalLink, Volume2, X } from 'lucide-react';
import { ScheduleItem } from '../types/schedule';
import { SOUND_PROFILES } from '../utils/audioEngine';

interface UrgentAlertBannerProps {
  item: ScheduleItem;
  isLooping: boolean;
  onAcknowledge: () => void;
  onSnooze: (minutes: number) => void;
  onReplaySound: () => void;
  onOpenMeeting?: (id: string) => void;
}

export function UrgentAlertBanner({
  item,
  isLooping,
  onAcknowledge,
  onSnooze,
  onReplaySound,
  onOpenMeeting,
}: UrgentAlertBannerProps) {
  const isUrgent = item.priority === 'urgent';
  const soundMeta = SOUND_PROFILES.find((s) => s.id === item.soundId);

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={`${isUrgent ? 'Urgent' : 'Important'} schedule alert: ${item.title}`}
      className={`rounded-xl border p-4 sm:p-5 transition-colors ${
        isUrgent
          ? 'bg-red-50 border-red-300 text-slate-900'
          : 'bg-amber-50 border-amber-300 text-slate-900'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
              isUrgent
                ? 'bg-red-600 border-red-700 text-white'
                : 'bg-amber-600 border-amber-700 text-white'
            }`}
          >
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className={isUrgent ? 'text-red-700' : 'text-amber-800'}>
                {isUrgent ? 'Urgent Schedule Alert' : 'Important Schedule Reminder'}
              </span>
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
              <span className="font-mono tabular-nums text-slate-700">
                {item.startTime} – {item.endTime}
              </span>
              {soundMeta && (
                <>
                  <span className="text-slate-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-slate-600 font-medium">
                    {isLooping ? `Audio repeating (${soundMeta.name})` : `Sound: ${soundMeta.name}`}
                  </span>
                </>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
              {item.title}
            </h2>

            {item.locationOrLink && (
              <p className="text-xs text-slate-600 truncate flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                <span className="truncate">{item.locationOrLink}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onReplaySound}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            Replay Sound
          </button>

          <button
            type="button"
            onClick={() => onSnooze(5)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Snooze 5m
          </button>

          {item.category === 'meeting' && onOpenMeeting && (
            <button
              type="button"
              onClick={() => {
                onAcknowledge();
                onOpenMeeting(item.id);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
            >
              Open Agenda
            </button>
          )}

          <button
            type="button"
            onClick={onAcknowledge}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 whitespace-nowrap shrink-0 ${
              isUrgent
                ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600'
                : 'bg-slate-900 hover:bg-slate-800 focus-visible:outline-slate-900'
            }`}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Acknowledge & Silence
          </button>
        </div>
      </div>
    </div>
  );
}
