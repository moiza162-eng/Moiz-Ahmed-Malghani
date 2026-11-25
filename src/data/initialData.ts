import { AlertPreferences, ScheduleItem } from '../types/schedule';

export function formatLocalDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeHHMM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function addMinutesToDate(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function getDurationMinutes(startTime: string, endTime: string): number {
  const diff = timeToMinutes(endTime) - timeToMinutes(startTime);
  return diff > 0 ? diff : 30;
}

export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hrs}h` : `${hrs}h ${rem}m`;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getScheduleDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

export const DEFAULT_ALERT_PREFERENCES: AlertPreferences = {
  defaultUrgentSound: 'urgent-beacon',
  defaultImportantSound: 'executive-chime',
  volume: 0.85,
  repeatUrgentUntilDismissed: true,
  browserNotificationsEnabled: false,
};

export function buildInitialSchedules(now: Date = new Date()): ScheduleItem[] {
  const today = formatLocalDateISO(now);
  const tomorrow = formatLocalDateISO(addMinutesToDate(now, 24 * 60));

  // Anchor items relative to the current time so today's timeline always feels alive and realistic
  const pastMorningStart = formatTimeHHMM(addMinutesToDate(now, -120));
  const pastMorningEnd = formatTimeHHMM(addMinutesToDate(now, -90));

  const nextMeetingStart = formatTimeHHMM(addMinutesToDate(now, 18));
  const nextMeetingEnd = formatTimeHHMM(addMinutesToDate(now, 63));

  const focusStart = formatTimeHHMM(addMinutesToDate(now, 75));
  const focusEnd = formatTimeHHMM(addMinutesToDate(now, 165));

  const urgentDeadlineStart = formatTimeHHMM(addMinutesToDate(now, 185));
  const urgentDeadlineEnd = formatTimeHHMM(addMinutesToDate(now, 215));

  const lateSyncStart = formatTimeHHMM(addMinutesToDate(now, 240));
  const lateSyncEnd = formatTimeHHMM(addMinutesToDate(now, 285));

  return [
    {
      id: 'sched-morning-standup',
      title: 'Product & Engineering Daily Standup',
      date: today,
      startTime: pastMorningStart,
      endTime: pastMorningEnd,
      category: 'meeting',
      priority: 'important',
      audioAlertEnabled: true,
      alertLeadMinutes: 5,
      soundId: 'executive-chime',
      completed: true,
      locationOrLink: 'https://meet.cadence.app/eng-standup',
      notes: 'Reviewed sprint blockers and confirmed API freeze for Thursday release.',
      attendees: [
        { id: 'a1', name: 'Elena Rostova', role: 'Engineering Lead', email: 'elena@company.com', confirmed: true },
        { id: 'a2', name: 'Marcus Vance', role: 'Product Designer', email: 'marcus@company.com', confirmed: true },
        { id: 'a3', name: 'Priya Nair', role: 'Backend Architect', email: 'priya@company.com', confirmed: true },
      ],
      agenda: [
        { id: 'ag1', topic: 'Release readiness & QA sign-off', durationMinutes: 10, owner: 'Elena', completed: true },
        { id: 'ag2', topic: 'Design polish handoff', durationMinutes: 10, owner: 'Marcus', completed: true },
        { id: 'ag3', topic: 'Infrastructure load check', durationMinutes: 10, owner: 'Priya', completed: true },
      ],
      actionItems: [
        { id: 'act1', text: 'Share updated staging checklist with QA', assignee: 'Elena', done: true },
      ],
    },
    {
      id: 'sched-exec-review',
      title: 'Q4 Budget & Roadmap Alignment Meeting',
      date: today,
      startTime: nextMeetingStart,
      endTime: nextMeetingEnd,
      category: 'meeting',
      priority: 'urgent',
      audioAlertEnabled: true,
      alertLeadMinutes: 5,
      soundId: 'urgent-beacon',
      completed: false,
      locationOrLink: 'Conference Room 4B · https://meet.cadence.app/q4-roadmap',
      notes: 'Final decision meeting for Q4 staffing allocation and hardware procurement.',
      attendees: [
        { id: 'a4', name: 'Claire Sterling', role: 'VP Operations', email: 'claire@company.com', confirmed: true },
        { id: 'a5', name: 'David Chen', role: 'Finance Partner', email: 'david@company.com', confirmed: true },
        { id: 'a6', name: 'Hannah Brooks', role: 'Program Lead', email: 'hannah@company.com', confirmed: false },
      ],
      agenda: [
        { id: 'ag4', topic: 'Q3 actuals vs forecast recap', durationMinutes: 10, owner: 'David', completed: false },
        { id: 'ag5', topic: 'Core platform headcount requests', durationMinutes: 20, owner: 'Claire', completed: false },
        { id: 'ag6', topic: 'Approval sign-off & next milestones', durationMinutes: 15, owner: 'You', completed: false },
      ],
      actionItems: [
        { id: 'act2', text: 'Bring revised contractor budget sheet', assignee: 'You', done: false },
        { id: 'act3', text: 'Confirm hiring start dates with People Ops', assignee: 'Claire', done: false },
      ],
    },
    {
      id: 'sched-deep-work',
      title: 'Deep Work: Architecture Specification Draft',
      date: today,
      startTime: focusStart,
      endTime: focusEnd,
      category: 'focus',
      priority: 'important',
      audioAlertEnabled: true,
      alertLeadMinutes: 5,
      soundId: 'cascade-bell',
      completed: false,
      locationOrLink: 'Quiet Focus Block',
      notes: 'Finish sections 3 and 4 before vendor sync.',
      attendees: [],
      agenda: [],
      actionItems: [
        { id: 'act4', text: 'Draft sequence diagrams for notification pipeline', assignee: 'You', done: false },
      ],
    },
    {
      id: 'sched-vendor-cutoff',
      title: 'Urgent Contract Sign-Off & Security Review',
      date: today,
      startTime: urgentDeadlineStart,
      endTime: urgentDeadlineEnd,
      category: 'deadline',
      priority: 'urgent',
      audioAlertEnabled: true,
      alertLeadMinutes: 10,
      soundId: 'sharp-pulse',
      completed: false,
      locationOrLink: 'Legal Portal · Doc #4821',
      notes: 'Countersignature required before 5:00 PM cutoff to preserve onboarding slot.',
      attendees: [
        { id: 'a7', name: 'Jordan Alverez', role: 'Legal Counsel', email: 'jordan@company.com', confirmed: true },
      ],
      agenda: [
        { id: 'ag7', topic: 'Verify SLA addendum clauses', durationMinutes: 15, owner: 'Jordan', completed: false },
        { id: 'ag8', topic: 'Execute final e-signature', durationMinutes: 15, owner: 'You', completed: false },
      ],
      actionItems: [],
    },
    {
      id: 'sched-client-sync',
      title: 'Client Onboarding Kickoff: Northstar Logistics',
      date: today,
      startTime: lateSyncStart,
      endTime: lateSyncEnd,
      category: 'meeting',
      priority: 'important',
      audioAlertEnabled: true,
      alertLeadMinutes: 5,
      soundId: 'executive-chime',
      completed: false,
      locationOrLink: 'https://meet.cadence.app/northstar-kickoff',
      notes: 'Introduce implementation milestones and shared Slack channels.',
      attendees: [
        { id: 'a8', name: 'Sophia Lindqvist', role: 'Client Director', email: 'sophia@northstar.io', confirmed: true },
        { id: 'a9', name: 'Liam O’Connor', role: 'Solutions Lead', email: 'liam@company.com', confirmed: true },
      ],
      agenda: [
        { id: 'ag9', topic: 'Team introductions & communication cadence', durationMinutes: 10, owner: 'You', completed: false },
        { id: 'ag10', topic: 'Data migration timeline walkthrough', durationMinutes: 25, owner: 'Liam', completed: false },
        { id: 'ag11', topic: 'Q&A and week-1 deliverables', durationMinutes: 10, owner: 'Sophia', completed: false },
      ],
      actionItems: [
        { id: 'act5', text: 'Send kickoff deck immediately after call', assignee: 'You', done: false },
      ],
    },
    {
      id: 'sched-tomorrow-prep',
      title: 'Weekly Executive Briefing Prep',
      date: tomorrow,
      startTime: '09:30',
      endTime: '10:30',
      category: 'meeting',
      priority: 'important',
      audioAlertEnabled: true,
      alertLeadMinutes: 10,
      soundId: 'executive-chime',
      completed: false,
      locationOrLink: 'Boardroom A',
      notes: 'Consolidate metrics across product, customer success, and reliability.',
      attendees: [
        { id: 'a10', name: 'Claire Sterling', role: 'VP Operations', email: 'claire@company.com', confirmed: true },
      ],
      agenda: [
        { id: 'ag12', topic: 'Review weekly KPI narrative', durationMinutes: 30, owner: 'You', completed: false },
        { id: 'ag13', topic: 'Flag escalation risks', durationMinutes: 30, owner: 'Claire', completed: false },
      ],
      actionItems: [],
    },
  ];
}
