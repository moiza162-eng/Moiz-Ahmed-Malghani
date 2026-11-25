export type SchedulePriority = 'standard' | 'important' | 'urgent';

export type ScheduleCategory = 'meeting' | 'focus' | 'deadline' | 'reminder';

export type AlertLeadMinutes = 0 | 5 | 10 | 15 | 30;

export type AlertSoundId =
  | 'urgent-beacon'
  | 'sharp-pulse'
  | 'executive-chime'
  | 'cascade-bell';

export type ViewMode = 'today' | 'meetings' | 'alerts' | 'upcoming';

export interface Attendee {
  id: string;
  name: string;
  role: string;
  email?: string;
  confirmed: boolean;
}

export interface AgendaItem {
  id: string;
  topic: string;
  durationMinutes: number;
  owner: string;
  completed: boolean;
}

export interface ActionItem {
  id: string;
  text: string;
  assignee: string;
  done: boolean;
}

export interface ScheduleItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD in local time
  startTime: string; // HH:MM (24-hour)
  endTime: string; // HH:MM (24-hour)
  category: ScheduleCategory;
  priority: SchedulePriority;
  audioAlertEnabled: boolean;
  alertLeadMinutes: AlertLeadMinutes;
  soundId?: AlertSoundId;
  completed: boolean;
  locationOrLink?: string;
  notes?: string;
  attendees: Attendee[];
  agenda: AgendaItem[];
  actionItems: ActionItem[];
  snoozedUntil?: number; // epoch ms
  exactTriggerAt?: number; // optional epoch ms override for immediate countdown tests
  triggeredAt?: number; // epoch ms when alert last fired for this occurrence
  acknowledged?: boolean;
}

export interface AlertPreferences {
  defaultUrgentSound: AlertSoundId;
  defaultImportantSound: AlertSoundId;
  volume: number; // 0 to 1
  repeatUrgentUntilDismissed: boolean;
  browserNotificationsEnabled: boolean;
}

export interface FiredAlertLog {
  id: string;
  scheduleId: string;
  scheduleTitle: string;
  priority: SchedulePriority;
  soundId: AlertSoundId;
  firedAt: number; // epoch ms
  status: 'active' | 'acknowledged' | 'snoozed';
}
