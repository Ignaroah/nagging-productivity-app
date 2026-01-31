export type Task = {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number;
  hoursCompleted: number;
  defaultNagInterval?: number; // Per-task default nag interval in minutes
  defaultChunkSize?: number; // Per-task default chunk size in minutes
  createdAt: string;
};

export type ScheduleBreak = {
  id: string;
  time: string; // HH:mm format
  durationMinutes: number;
};

export type Schedule = {
  id: string;
  name?: string; // Optional name for saved schedules
  date: string;
  startTime: string;
  endTime: string;
  breaks: ScheduleBreak[]; // Multiple breaks at specific times
  defaultChunkSize: number;
  status: 'active' | 'completed';
  chunks: ScheduleChunk[];
  createdAt: string;
};

export type ScheduleChunk = {
  id: string;
  taskId: string;
  taskTitle: string;
  taskPriority: 'high' | 'medium' | 'low';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  nagIntervalMinutes: number;
  type: 'task' | 'break';
  completed: boolean;
  completedAt?: string;
};

export type AppSettings = {
  notificationsEnabled: boolean;
  defaultBreakDuration: number;
  defaultChunkSize: number;
  defaultNagInterval: number;
  timeUnit: 'hours' | 'minutes'; // Toggle between hours and minutes
};

export const STORAGE_KEYS = {
  tasks: 'nagging_app_tasks',
  schedules: 'nagging_app_schedules',
  activeScheduleId: 'nagging_app_active_schedule',
  settings: 'nagging_app_settings'
} as const;
