
export interface TaskItem {
  id: string;
  title: string;
  description: string;
  dayOffset: number; // 0 for today, 1 for tomorrow, etc.
  startTime: string; // "HH:MM" 24h format
  durationMinutes: number;
  isCompleted?: boolean;
  reminderStyle?: ReminderStyle;
}

export type ReminderStyle = 'ALARM' | 'VIBRATE' | 'NONE';
export type ReminderSetting = 'AUTO' | ReminderStyle;

export interface Plan {
  id: string;
  createdAt: number;
  startDate: number; // Timestamp of when the plan starts (usually creation time)
  goal: string;
  tasks: TaskItem[];
}

export enum LoadingState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type Tab = 'create' | 'review' | 'plan' | 'goals' | 'settings';

export type Language = 'en' | 'zh' | 'ja' | 'ko';

export type ThemeColor = 'indigo' | 'blue' | 'emerald' | 'rose' | 'amber' | 'violet' | 'slate' | 'teal' | 'cyan' | 'fuchsia' | 'pink' | 'orange';

export type BackgroundTheme = 'DEFAULT' | 'SUMMER' | 'WARM' | 'CYBER' | 'CUSTOM';