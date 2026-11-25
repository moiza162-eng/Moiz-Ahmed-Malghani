import React, { useEffect, useState } from 'react';
import { Volume2, X } from 'lucide-react';
import {
  AlertLeadMinutes,
  AlertPreferences,
  AlertSoundId,
  ScheduleCategory,
  ScheduleItem,
  SchedulePriority,
} from '../types/schedule';
import { formatLocalDateISO } from '../data/initialData';
import { audioEngine, SOUND_PROFILES } from '../utils/audioEngine';

interface ScheduleModalProps {
  isOpen: boolean;
  initialItem: ScheduleItem | null;
  defaultCategory?: ScheduleCategory;
  alertPrefs: AlertPreferences;
  onClose: () => void;
  onSave: (item: ScheduleItem) => void;
}

export function ScheduleModal({
  isOpen,
  initialItem,
  defaultCategory = 'meeting',
  alertPrefs,
  onClose,
  onSave,
}: ScheduleModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(formatLocalDateISO(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:45');
  const [category, setCategory] = useState<ScheduleCategory>(defaultCategory);
  const [priority, setPriority] = useState<SchedulePriority>('important');
  const [audioAlertEnabled, setAudioAlertEnabled] = useState(true);
  const [alertLeadMinutes, setAlertLeadMinutes] = useState<AlertLeadMinutes>(5);
  const [soundId, setSoundId] = useState<AlertSoundId>(alertPrefs.defaultUrgentSound);
  const [locationOrLink, setLocationOrLink] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialItem) {
      setTitle(initialItem.title);
      setDate(initialItem.date);
      setStartTime(initialItem.startTime);
      setEndTime(initialItem.endTime);
      setCategory(initialItem.category);
      setPriority(initialItem.priority);
      setAudioAlertEnabled(initialItem.audioAlertEnabled);
      setAlertLeadMinutes(initialItem.alertLeadMinutes);
      setSoundId(
        initialItem.soundId ||
          (initialItem.priority === 'urgent'
            ? alertPrefs.defaultUrgentSound
            : alertPrefs.defaultImportantSound)
      );
      setLocationOrLink(initialItem.locationOrLink || '');
      setNotes(initialItem.notes || '');
      setError('');
    } else {
      const now = new Date();
      const plus15 = new Date(now.getTime() + 15 * 60_000);
      const plus60 = new Date(now.getTime() + 60 * 60_000);
      const fmt = (d: Date) =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      setTitle('');
      setDate(formatLocalDateISO(now));
      setStartTime(fmt(plus15));
      setEndTime(fmt(plus60));
      setCategory(defaultCategory);
      setPriority('important');
      setAudioAlertEnabled(true);
      setAlertLeadMinutes(5);
      setSoundId(alertPrefs.defaultImportantSound);
      setLocationOrLink('');
      setNotes('');
      setError('');
    }
  }, [isOpen, initialItem, defaultCategory, alertPrefs]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePriorityChange = (nextPriority: SchedulePriority) => {
    setPriority(nextPriority);
    if (nextPriority === 'urgent') {
      setAudioAlertEnabled(true);
      setSoundId(alertPrefs.defaultUrgentSound);
    } else if (nextPriority === 'important') {
      setAudioAlertEnabled(true);
      setSoundId(alertPrefs.defaultImportantSound);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a schedule or meeting title.');
      return;
    }
    if (endTime <= startTime) {
      setError('End time must be after start time.');
      return;
    }

    const nextItem: ScheduleItem = {
      id: initialItem?.id || `sched-${Date.now()}`,
      title: title.trim(),
      date,
      startTime,
      endTime,
      category,
      priority,
      audioAlertEnabled,
      alertLeadMinutes,
      soundId,
      completed: initialItem?.completed || false,
      locationOrLink: locationOrLink.trim() || undefined,
      notes: notes.trim() || undefined,
      attendees: initialItem?.attendees || [],
      agenda: initialItem?.agenda || [],
      actionItems: initialItem?.actionItems || [],
      triggeredAt: undefined,
      acknowledged: false,
      snoozedUntil: undefined,
    };

    onSave(nextItem);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="schedule-modal-title" className="text-base font-semibold text-slate-900">
            {initialItem ? 'Edit Schedule Block' : 'Schedule New Block or Meeting'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="sched-title" className="block text-xs font-medium text-slate-700 mb-1.5">
              Title
            </label>
            <input
              id="sched-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Executive Product Sync or Contract Deadline"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Category</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                {(['meeting', 'focus', 'deadline', 'reminder'] as ScheduleCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                      category === cat
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {(['standard', 'important', 'urgent'] as SchedulePriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePriorityChange(p)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                      priority === p
                        ? p === 'urgent'
                          ? 'bg-red-600 text-white shadow-xs'
                          : p === 'important'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sched-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                Date
              </label>
              <input
                id="sched-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
            <div>
              <label htmlFor="sched-start" className="block text-xs font-medium text-slate-700 mb-1.5">
                Start Time
              </label>
              <input
                id="sched-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
            <div>
              <label htmlFor="sched-end" className="block text-xs font-medium text-slate-700 mb-1.5">
                End Time
              </label>
              <input
                id="sched-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="sched-location"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Location or Meeting Link
            </label>
            <input
              id="sched-location"
              type="text"
              value={locationOrLink}
              onChange={(e) => setLocationOrLink(e.target.value)}
              placeholder="Room 4B or https://meet.example.com/room"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">Audio Sound Notification</p>
                <p className="text-xs text-slate-500">
                  Play an urgent or reminder chime automatically before this block begins.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={audioAlertEnabled}
                onClick={() => setAudioAlertEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  audioAlertEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition-transform ${
                    audioAlertEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {audioAlertEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label
                    htmlFor="sched-lead"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Trigger Timing
                  </label>
                  <select
                    id="sched-lead"
                    value={alertLeadMinutes}
                    onChange={(e) => setAlertLeadMinutes(Number(e.target.value) as AlertLeadMinutes)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                  >
                    <option value={0}>At start time</option>
                    <option value={5}>5 minutes before</option>
                    <option value={10}>10 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sched-sound"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Alert Sound Profile
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      id="sched-sound"
                      value={soundId}
                      onChange={(e) => setSoundId(e.target.value as AlertSoundId)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none"
                    >
                      {SOUND_PROFILES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void audioEngine.playOnce(soundId, alertPrefs.volume)}
                      aria-label="Preview selected sound"
                      className="inline-flex h-[34px] shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                    >
                      <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Test
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="sched-notes" className="block text-xs font-medium text-slate-700 mb-1.5">
              Preparation Notes
            </label>
            <textarea
              id="sched-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key context, materials needed, or reminder instructions..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              {initialItem ? 'Save Changes' : 'Save to Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
