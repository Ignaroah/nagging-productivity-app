import { Task, Schedule, ScheduleChunk, ScheduleBreak } from '../types';
import { generateId, timeToMinutes, minutesToTime } from './utils';

function sortTasksByPriority(tasks: Task[]): Task[] {
  const priorityWeight = { high: 3, medium: 2, low: 1 };

  return [...tasks].sort((a, b) => {
    // First by priority
    const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by least progress (encourages finishing tasks)
    const aProgress = a.hoursCompleted / a.estimatedHours;
    const bProgress = b.hoursCompleted / b.estimatedHours;
    return aProgress - bProgress;
  });
}

export function generateSchedule(input: {
  tasks: Task[];
  startTime: string;
  endTime: string;
  breaks: ScheduleBreak[];
  defaultChunkSize: number;
  defaultNagInterval: number;
  date: string;
  name?: string;
}): Schedule {
  // 1. Filter tasks with remaining time
  const availableTasks = input.tasks.filter(
    t => t.hoursCompleted < t.estimatedHours
  );

  if (availableTasks.length === 0) {
    return {
      id: generateId(),
      name: input.name,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      breaks: input.breaks,
      defaultChunkSize: input.defaultChunkSize,
      status: 'active',
      chunks: [],
      createdAt: new Date().toISOString()
    };
  }

  // 2. Sort by priority and progress
  const sortedTasks = sortTasksByPriority(availableTasks);

  // 3. Sort breaks by time
  const sortedBreaks = [...input.breaks].sort((a, b) =>
    timeToMinutes(a.time) - timeToMinutes(b.time)
  );

  // 4. Generate chunks
  const chunks: ScheduleChunk[] = [];
  let currentMinutes = timeToMinutes(input.startTime);
  let taskIndex = 0;
  let breakIndex = 0;

  while (currentMinutes < timeToMinutes(input.endTime)) {
    // Check if we should insert a break
    if (
      breakIndex < sortedBreaks.length &&
      currentMinutes >= timeToMinutes(sortedBreaks[breakIndex].time)
    ) {
      const breakItem = sortedBreaks[breakIndex];
      const breakEnd = Math.min(
        currentMinutes + breakItem.durationMinutes,
        timeToMinutes(input.endTime)
      );

      chunks.push({
        id: generateId(),
        type: 'break',
        taskId: '',
        taskTitle: `Break (${breakItem.durationMinutes} min)`,
        taskPriority: 'medium',
        startTime: minutesToTime(currentMinutes),
        endTime: minutesToTime(breakEnd),
        durationMinutes: breakEnd - currentMinutes,
        nagIntervalMinutes: 0,
        completed: false
      });

      currentMinutes = breakEnd;
      breakIndex++;
      continue;
    }

    // Get next task (round-robin)
    if (sortedTasks.length === 0) break;
    const task = sortedTasks[taskIndex % sortedTasks.length];

    // Calculate remaining time for this task
    const remainingMinutes = (task.estimatedHours - task.hoursCompleted) * 60;

    // Calculate how much time until next break or end of schedule
    let maxChunkSize = timeToMinutes(input.endTime) - currentMinutes;
    if (breakIndex < sortedBreaks.length) {
      maxChunkSize = Math.min(maxChunkSize, timeToMinutes(sortedBreaks[breakIndex].time) - currentMinutes);
    }

    // Use task's default chunk size if set, otherwise use global default
    const taskChunkSize = task.defaultChunkSize !== undefined
      ? task.defaultChunkSize
      : input.defaultChunkSize;

    const chunkSize = Math.min(
      taskChunkSize,
      remainingMinutes,
      maxChunkSize
    );

    if (chunkSize <= 0) break;

    // Use task's default nag interval if set, otherwise use global default
    const nagInterval = task.defaultNagInterval !== undefined
      ? task.defaultNagInterval
      : input.defaultNagInterval;

    chunks.push({
      id: generateId(),
      type: 'task',
      taskId: task.id,
      taskTitle: task.title,
      taskPriority: task.priority,
      startTime: minutesToTime(currentMinutes),
      endTime: minutesToTime(currentMinutes + chunkSize),
      durationMinutes: chunkSize,
      nagIntervalMinutes: nagInterval,
      completed: false
    });

    currentMinutes += chunkSize;

    // Check if current task is fully allocated before moving to next
    if (chunkSize >= remainingMinutes) {
      // Remove this task from sorted list (use current index before incrementing)
      const currentTaskIndex = taskIndex % sortedTasks.length;
      sortedTasks.splice(currentTaskIndex, 1);
      if (sortedTasks.length === 0) break;
      // Don't increment taskIndex since we removed an element
      // The next task is now at the same index position
      taskIndex = currentTaskIndex % sortedTasks.length;
    } else {
      // Task not fully allocated, move to next task in round-robin
      taskIndex++;
    }
  }

  return {
    id: generateId(),
    name: input.name,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    breaks: input.breaks,
    defaultChunkSize: input.defaultChunkSize,
    status: 'active',
    chunks,
    createdAt: new Date().toISOString()
  };
}
