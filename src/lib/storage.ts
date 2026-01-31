import { Task, Schedule, AppSettings, STORAGE_KEYS } from '../types';

// Settings
export function getSettings(): AppSettings {
  const stored = localStorage.getItem(STORAGE_KEYS.settings);
  if (stored) {
    const settings = JSON.parse(stored);
    // Backward compatibility - add timeUnit if missing
    if (!settings.timeUnit) {
      settings.timeUnit = 'minutes';
    }
    return settings;
  }
  const defaultSettings: AppSettings = {
    notificationsEnabled: false,
    defaultBreakDuration: 15,
    defaultChunkSize: 30,
    defaultNagInterval: 15,
    timeUnit: 'minutes'
  };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(defaultSettings));
  return defaultSettings;
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

// Tasks
export function getTasks(): Task[] {
  const stored = localStorage.getItem(STORAGE_KEYS.tasks);
  return stored ? JSON.parse(stored) : [];
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
}

export function addTask(task: Task): void {
  const tasks = getTasks();
  tasks.push(task);
  saveTasks(tasks);
}

export function updateTask(updatedTask: Task): void {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === updatedTask.id);
  if (index !== -1) {
    tasks[index] = updatedTask;
    saveTasks(tasks);
  }
}

export function deleteTask(taskId: string): void {
  const tasks = getTasks();
  const filtered = tasks.filter(t => t.id !== taskId);
  saveTasks(filtered);
}

// Schedules
export function getSchedules(): Schedule[] {
  const stored = localStorage.getItem(STORAGE_KEYS.schedules);
  return stored ? JSON.parse(stored) : [];
}

export function saveSchedules(schedules: Schedule[]): void {
  localStorage.setItem(STORAGE_KEYS.schedules, JSON.stringify(schedules));
}

export function addSchedule(schedule: Schedule): void {
  const schedules = getSchedules();
  schedules.push(schedule);
  saveSchedules(schedules);
}

export function getActiveScheduleId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.activeScheduleId);
}

export function setActiveScheduleId(scheduleId: string): void {
  localStorage.setItem(STORAGE_KEYS.activeScheduleId, scheduleId);
}

export function getActiveSchedule(): Schedule | null {
  const scheduleId = getActiveScheduleId();
  if (!scheduleId) return null;

  const schedules = getSchedules();
  return schedules.find(s => s.id === scheduleId) || null;
}

export function markChunkComplete(scheduleId: string, chunkId: string): void {
  const schedules = getSchedules();
  const schedule = schedules.find(s => s.id === scheduleId);
  if (!schedule) return;

  const chunk = schedule.chunks.find(c => c.id === chunkId);
  if (!chunk || chunk.completed) return;

  // Mark chunk complete
  chunk.completed = true;
  const completedAt = new Date();
  chunk.completedAt = completedAt.toISOString();

  // Update task progress (if task chunk)
  if (chunk.type === 'task') {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === chunk.taskId);
    if (task) {
      // Calculate actual elapsed time
      const now = completedAt;
      const [startHours, startMinutes] = chunk.startTime.split(':').map(Number);
      const chunkStart = new Date(now);
      chunkStart.setHours(startHours, startMinutes, 0, 0);

      // If chunk start is in the future (shouldn't happen), use full duration
      // Otherwise calculate elapsed minutes
      let elapsedMinutes: number;
      if (now.getTime() < chunkStart.getTime()) {
        elapsedMinutes = chunk.durationMinutes; // Shouldn't happen, but use full duration as fallback
      } else {
        elapsedMinutes = Math.round((now.getTime() - chunkStart.getTime()) / (1000 * 60));
        // No maximum cap - overtime work should be fully credited!
        // Ensure at least 1 minute is counted
        elapsedMinutes = Math.max(elapsedMinutes, 1);
      }

      // Add only the elapsed time to task progress
      task.hoursCompleted += elapsedMinutes / 60;
      // Ensure we don't exceed estimated hours
      task.hoursCompleted = Math.min(task.hoursCompleted, task.estimatedHours);
      saveTasks(tasks);
    }
  }

  saveSchedules(schedules);
}
