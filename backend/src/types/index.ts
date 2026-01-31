// Shared types between frontend and backend

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  pictureUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId?: string;  // Added for backend
  title: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number;
  hoursCompleted: number;
  defaultNagInterval?: number;
  createdAt: string;
  updatedAt?: string;  // Added for backend
}

export interface Schedule {
  id: string;
  userId?: string;  // Added for backend
  name?: string;
  date: string;
  startTime: string;
  endTime: string;
  breaks: ScheduleBreak[];
  defaultChunkSize: number;
  status: 'active' | 'completed';
  chunks: ScheduleChunk[];
  createdAt: string;
  updatedAt?: string;  // Added for backend
}

export interface ScheduleChunk {
  id: string;
  scheduleId?: string;  // Added for backend
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
}

export interface ScheduleBreak {
  id: string;
  scheduleId?: string;  // Added for backend
  time: string;
  durationMinutes: number;
}

export interface AppSettings {
  id?: string;  // Added for backend
  userId?: string;  // Added for backend
  notificationsEnabled: boolean;
  defaultBreakDuration: number;
  defaultChunkSize: number;
  defaultNagInterval: number;
  timeUnit: 'hours' | 'minutes';
  createdAt?: string;  // Added for backend
  updatedAt?: string;  // Added for backend
}

// API Request/Response types

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MigrationRequest {
  tasks: Task[];
  schedules: Schedule[];
  settings: AppSettings;
  activeScheduleId?: string;
}

export interface MigrationResponse {
  success: boolean;
  migrated: {
    tasks: number;
    schedules: number;
    settings: boolean;
  };
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}
