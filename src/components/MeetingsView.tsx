import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  Check,
  Clock,
  Copy,
  Edit3,
  Link as LinkIcon,
  Plus,
  Trash2,
  UserPlus,
  Users,
  Volume2,
} from 'lucide-react';
import { ActionItem, AgendaItem, Attendee, ScheduleItem } from '../types/schedule';
import { formatDurationLabel, getDurationMinutes } from '../data/initialData';

interface MeetingsViewProps {
  schedules: ScheduleItem[];
  selectedMeetingId: string | null;
  onSelectMeeting: (id: string) => void;
  onUpdateMeeting: (updated: ScheduleItem) => void;
  onEditMeetingModal: (item: ScheduleItem) => void;
  onCreateNewMeeting: () => void;
  onTestAlertItem: (item: ScheduleItem) => void;
}

type MeetingFilter = 'all' | 'upcoming' | 'urgent';

export function MeetingsView({
  schedules,
  selectedMeetingId,
  onSelectMeeting,
  onUpdateMeeting,
  onEditMeetingModal,
  onCreateNewMeeting,
  onTestAlertItem,
}: MeetingsViewProps) {
  const [filter, setFilter] = useState<MeetingFilter>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  // Inline form states
  const [newTopic, setNewTopic] = useState('');
  const [newTopicOwner, setNewTopicOwner] = useState('You');
  const [newTopicMinutes, setNewTopicMinutes] = useState(10);

  const [newAttendeeName, setNewAttendeeName] = useState('');
  const [newAttendeeRole, setNewAttendeeRole] = useState('');

  const [newActionText, setNewActionText] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('You');

  const meetings = useMemo(() => {
    const list = schedules
      .filter((s) => s.category === 'meeting')
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });

    if (filter === 'upcoming') return list.filter((m) => !m.completed);
    if (filter === 'urgent') return list.filter((m) => m.priority === 'urgent');
    return list;
  }, [schedules, filter]);

  const activeMeeting = useMemo(() => {
    if (selectedMeetingId) {
      const found = meetings.find((m) => m.id === selectedMeetingId) || schedules.find((m) => m.id === selectedMeetingId && m.category === 'meeting');
      if (found) return found;
    }
    return meetings[0] || null;
  }, [meetings, schedules, selectedMeetingId]);

  const handleCopyLocation = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleAddAgendaItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeeting || !newTopic.trim()) return;
    const item: AgendaItem = {
      id: `ag-${Date.now()}`,
      topic: newTopic.trim(),
      durationMinutes: Math.max(1, Number(newTopicMinutes) || 10),
      owner: newTopicOwner.trim() || 'You',
      completed: false,
    };
    onUpdateMeeting({
      ...activeMeeting,
      agenda: [...activeMeeting.agenda, item],
    });
    setNewTopic('');
  };

  const handleToggleAgenda = (agendaId: string) => {
    if (!activeMeeting) return;
    onUpdateMeeting({
      ...activeMeeting,
      agenda: activeMeeting.agenda.map((a) =>
        a.id === agendaId ? { ...a, completed: !a.completed } : a
      ),
    });
  };

  const handleDeleteAgenda = (agendaId: string) => {
    if (!activeMeeting) return;
    onUpdateMeeting({
      ...activeMeeting,
      agenda: activeMeeting.agenda.filter((a) => a.id !== agendaId),
    });
  };

  const handleAddAttendee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeeting || !newAttendeeName.trim()) return;
    const attendee: Attendee = {
      id: `att-${Date.now()}`,
      name: newAttendeeName.trim(),
      role: newAttendeeRole.trim() || 'Participant',
      confirmed: true,
    };
    onUpdateMeeting({
      ...activeMeeting,
      attendees: [...activeMeeting.attendees, attendee],
    });
    setNewAttendeeName('');
    setNewAttendeeRole('');
  };

  const handleToggleAttendeeConfirmed = (attendeeId: string) => {
    if (!activeMeeting) return;
    onUpdateMeeting({
      ...activeMeeting,
      attendees: activeMeeting.attendees.map((att) =>
        att.id === attendeeId ? { ...att, confirmed: !att.confirmed } : att
      ),
    });
  };

  const handleDeleteAttendee = (attendeeId: string) => {
    if (!activeMeeting) return;
    onUpdateMeeting({
      ...activeMeeting,
      attendees: activeMeeting.attendees.filter((att) => att.id !== attendeeId),
    });
  };

  const handleAddActionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeeting || !newActionText.trim()) return;
    const action: ActionItem = {
      id: `act-${Date.now()}`,
      text: newActionText.trim(),
      assignee: newActionAssignee.trim() || 'You',
      done: false,
    };
    onUpdateMeeting({
      ...activeMeeting,
      actionItems: [...activeMeeting.actionItems, action],
    });
    setNewActionText('');
  };

  const handleToggleActionItem = (actionId: string) => {
    if (!activeMeeting) return;
    onUpdateMeeting({
      ...activeMeeting,
      actionItems: activeMeeting.actionItems.map((act) =>
        act.id === actionId ? { ...act, done: !act.done } : act
      ),
    });
  };

  const handleDeleteActionItem = (actionId: string) => {
    if (!activeMeeting) return;
    onUpdateMeeting({
      ...activeMeeting,
      actionItems: activeMeeting.actionItems.filter((act) => act.id !== actionId),
    });
  };

  const totalMeetingDuration = activeMeeting
    ? getDurationMinutes(activeMeeting.startTime, activeMeeting.endTime)
    : 0;
  const allocatedAgendaMinutes = activeMeeting
    ? activeMeeting.agenda.reduce((sum, a) => sum + a.durationMinutes, 0)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Meetings List */}
      <aside className="lg:col-span-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Meetings</h2>
            <button
              type="button"
              onClick={onCreateNewMeeting}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              New Meeting
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'urgent', label: 'Urgent' },
              ] as { id: MeetingFilter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {meetings.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" />
            <p className="mt-2 text-xs font-medium text-slate-700">No meetings found</p>
            <p className="mt-1 text-xs text-slate-500">Create a meeting to organize its agenda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 max-h-[680px] overflow-y-auto">
            {meetings.map((m) => {
              const isSelected = activeMeeting?.id === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelectMeeting(m.id)}
                    className={`w-full text-left px-4 py-3.5 transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-600 ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums text-slate-500">
                      <span>
                        {m.date} · {m.startTime}–{m.endTime}
                      </span>
                      {m.priority === 'urgent' ? (
                        <span className="font-sans font-semibold text-red-600">Urgent</span>
                      ) : m.priority === 'important' ? (
                        <span className="font-sans font-semibold text-amber-700">Important</span>
                      ) : null}
                    </div>
                    <p
                      className={`mt-1 text-sm font-semibold truncate ${
                        isSelected ? 'text-blue-950' : 'text-slate-900'
                      }`}
                    >
                      {m.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {m.attendees.length} attendees · {m.agenda.length} agenda topics
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* Right Column: Meeting Workspace */}
      <section className="lg:col-span-8 rounded-xl border border-slate-200 bg-white overflow-hidden">
        {!activeMeeting ? (
          <div className="p-14 text-center">
            <Users className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">Select a meeting</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Choose a meeting on the left or create a new one to manage attendees, timed agendas,
              action items, and urgent audio alerts.
            </p>
            <button
              type="button"
              onClick={onCreateNewMeeting}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Schedule Meeting
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {/* Meeting Header */}
            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono tabular-nums font-medium text-slate-700">
                      {activeMeeting.date} · {activeMeeting.startTime} – {activeMeeting.endTime} (
                      {formatDurationLabel(totalMeetingDuration)})
                    </span>
                    <span aria-hidden="true">·</span>
                    {activeMeeting.priority === 'urgent' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        Urgent Priority
                      </span>
                    ) : activeMeeting.priority === 'important' ? (
                      <span className="font-semibold text-amber-700">Important Priority</span>
                    ) : (
                      <span>Standard Priority</span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <BellRing className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                      {activeMeeting.audioAlertEnabled
                        ? `Audio alert ${activeMeeting.alertLeadMinutes}m prior`
                        : 'Audio alert muted'}
                    </span>
                  </div>

                  <h2 className="text-xl font-semibold text-slate-900">{activeMeeting.title}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onTestAlertItem(activeMeeting)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Test Alert Sound
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditMeetingModal(activeMeeting)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit Details
                  </button>
                </div>
              </div>

              {activeMeeting.locationOrLink && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 min-w-0 text-xs text-slate-700">
                    <LinkIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                    <span className="truncate font-medium">{activeMeeting.locationOrLink}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopyLocation(activeMeeting.locationOrLink || '')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            {/* Section 1: Timed Agenda Builder */}
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Structured Agenda</h3>
                  <p className="text-xs text-slate-500">
                    Allocate minutes per topic so your meeting stays on schedule.
                  </p>
                </div>
                <div className="text-xs font-mono tabular-nums">
                  <span
                    className={`font-semibold ${
                      allocatedAgendaMinutes > totalMeetingDuration
                        ? 'text-red-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {allocatedAgendaMinutes}m
                  </span>
                  <span className="text-slate-500"> / {totalMeetingDuration}m allocated</span>
                </div>
              </div>

              {activeMeeting.agenda.length > 0 && (
                <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  {activeMeeting.agenda.map((ag, idx) => (
                    <li
                      key={ag.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAgenda(ag.id)}
                          aria-label={`Toggle agenda item ${ag.topic}`}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            ag.completed
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-slate-300 text-transparent hover:border-slate-400'
                          }`}
                        >
                          <Check className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <span className="text-xs font-mono tabular-nums text-slate-400 w-5">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              ag.completed ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {ag.topic}
                          </p>
                          <p className="text-xs text-slate-500">Owner: {ag.owner}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-slate-600">
                          <Clock className="h-3 w-3 text-slate-400" aria-hidden="true" />
                          {ag.durationMinutes}m
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteAgenda(ag.id)}
                          aria-label={`Remove ${ag.topic}`}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleAddAgendaItem} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Add agenda topic..."
                  aria-label="New agenda topic"
                  className="sm:col-span-6 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={newTopicOwner}
                  onChange={(e) => setNewTopicOwner(e.target.value)}
                  placeholder="Owner"
                  aria-label="Topic owner"
                  className="sm:col-span-3 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={newTopicMinutes}
                  onChange={(e) => setNewTopicMinutes(Number(e.target.value))}
                  aria-label="Duration in minutes"
                  className="sm:col-span-1 rounded-lg border border-slate-300 px-2 py-2 text-xs font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Topic
                </button>
              </form>
            </div>

            {/* Section 2: Attendees */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Attendees ({activeMeeting.attendees.length})
                </h3>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {activeMeeting.attendees.filter((a) => a.confirmed).length} confirmed
                </span>
              </div>

              {activeMeeting.attendees.length > 0 && (
                <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  {activeMeeting.attendees.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{att.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {att.role}
                          {att.email ? ` · ${att.email}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAttendeeConfirmed(att.id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                            att.confirmed
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {att.confirmed ? 'Confirmed' : 'Pending'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttendee(att.id)}
                          aria-label={`Remove ${att.name}`}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleAddAttendee} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={newAttendeeName}
                  onChange={(e) => setNewAttendeeName(e.target.value)}
                  placeholder="Attendee name..."
                  aria-label="Attendee name"
                  className="sm:col-span-5 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
                <input
                  type="text"
                  value={newAttendeeRole}
                  onChange={(e) => setNewAttendeeRole(e.target.value)}
                  placeholder="Role or team..."
                  aria-label="Attendee role"
                  className="sm:col-span-5 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add
                </button>
              </form>
            </div>

            {/* Section 3: Action Items & Notes */}
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Action Items</h3>
                {activeMeeting.actionItems.length > 0 && (
                  <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    {activeMeeting.actionItems.map((act) => (
                      <li
                        key={act.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleActionItem(act.id)}
                            aria-label={`Toggle action item ${act.text}`}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              act.done
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-slate-300 text-transparent hover:border-slate-400'
                            }`}
                          >
                            <Check className="h-3 w-3" aria-hidden="true" />
                          </button>
                          <div className="min-w-0">
                            <p
                              className={`text-sm truncate ${
                                act.done ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {act.text}
                            </p>
                            <p className="text-xs text-slate-500">Assigned to {act.assignee}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteActionItem(act.id)}
                          aria-label={`Delete action item ${act.text}`}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  onSubmit={handleAddActionItem}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2"
                >
                  <input
                    type="text"
                    value={newActionText}
                    onChange={(e) => setNewActionText(e.target.value)}
                    placeholder="Add follow-up action item..."
                    aria-label="New action item"
                    className="sm:col-span-7 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newActionAssignee}
                    onChange={(e) => setNewActionAssignee(e.target.value)}
                    placeholder="Assignee"
                    aria-label="Action item assignee"
                    className="sm:col-span-3 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add
                  </button>
                </form>
              </div>

              <div>
                <label
                  htmlFor="meeting-notes"
                  className="block text-sm font-semibold text-slate-900 mb-1.5"
                >
                  Meeting Notes & Decisions
                </label>
                <textarea
                  id="meeting-notes"
                  rows={3}
                  value={activeMeeting.notes || ''}
                  onChange={(e) =>
                    onUpdateMeeting({
                      ...activeMeeting,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Capture decisions, blockers, and key takeaways..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
