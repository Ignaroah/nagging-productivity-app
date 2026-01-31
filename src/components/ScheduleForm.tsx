import { useState, useEffect } from 'react';
import { Task, Schedule, ScheduleChunk, ScheduleBreak } from '../types';
import { generateSchedule } from '../lib/scheduler';
import { getTodayDate, formatTime, formatDuration, generateId, timeToMinutes, minutesToTime } from '../lib/utils';
import VisualScheduleEditor from './VisualScheduleEditor';
import ChunkEditModal from './ChunkEditModal';

interface ScheduleFormProps {
  tasks: Task[];
  defaultNagInterval: number;
  onScheduleCreated: (schedule: Schedule) => void;
}

// Helper function to get smart default times
const getDefaultTimes = () => {
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  // Start time: current time
  const startTime = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

  // End time: next full hour (e.g., 14:37 → 15:00)
  const endHours = currentMinutes > 0 ? currentHours + 1 : currentHours;
  const endTime = `${endHours.toString().padStart(2, '0')}:00`;

  return { startTime, endTime };
};

// Helper function to round time to nearest 5 minutes
const roundToNearest5Minutes = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const roundedMinutes = Math.round(minutes / 5) * 5;

  if (roundedMinutes === 60) {
    return `${(hours + 1).toString().padStart(2, '0')}:00`;
  }

  return `${hours.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
};

// Helper function to get smart default break time
const getDefaultBreakTime = (startTime: string, endTime: string): string => {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  // Calculate midpoint
  const midpointMinutes = Math.floor((startTotalMinutes + endTotalMinutes) / 2);
  const midHours = Math.floor(midpointMinutes / 60);
  const midMinutes = midpointMinutes % 60;

  const midpointTime = `${midHours.toString().padStart(2, '0')}:${midMinutes.toString().padStart(2, '0')}`;

  // Round to nearest 5 minutes
  const roundedTime = roundToNearest5Minutes(midpointTime);

  // Make sure it's within bounds
  const roundedTotalMinutes = parseInt(roundedTime.split(':')[0]) * 60 + parseInt(roundedTime.split(':')[1]);

  if (roundedTotalMinutes < startTotalMinutes) {
    return roundToNearest5Minutes(startTime);
  }
  if (roundedTotalMinutes > endTotalMinutes) {
    return roundToNearest5Minutes(endTime);
  }

  return roundedTime;
};

export default function ScheduleForm({ tasks, defaultNagInterval, onScheduleCreated }: ScheduleFormProps) {
  // Load preview state from localStorage on mount
  const loadPreviewState = () => {
    const stored = localStorage.getItem('schedule_preview_state');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  };

  const savedState = loadPreviewState();

  // Get smart default times (current time to next hour) - always use fresh times
  const defaultTimes = getDefaultTimes();

  const [scheduleName, setScheduleName] = useState(savedState?.scheduleName || '');
  const [date, setDate] = useState(savedState?.date || getTodayDate());
  // Always use current time defaults (don't restore from savedState)
  const [startTime, setStartTime] = useState(defaultTimes.startTime);
  const [endTime, setEndTime] = useState(defaultTimes.endTime);
  const [breaks, setBreaks] = useState<ScheduleBreak[]>(savedState?.breaks || []);
  const [defaultChunkSize, setDefaultChunkSize] = useState(savedState?.defaultChunkSize || 30);
  const [previewChunks, setPreviewChunks] = useState<ScheduleChunk[]>(savedState?.previewChunks || []);
  const [previewSchedule, setPreviewSchedule] = useState<Schedule | null>(savedState?.previewSchedule || null);
  const [showPreview, setShowPreview] = useState(savedState?.showPreview || false);
  const [viewMode, setViewMode] = useState<'list' | 'visual'>(savedState?.viewMode || 'visual');

  // Task selection - default to all incomplete tasks
  const incompleteTasks = tasks.filter(t => t.hoursCompleted < t.estimatedHours);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(
    savedState?.selectedTaskIds || incompleteTasks.map(t => t.id)
  );

  // New break form - use smart default based on schedule times
  const [newBreakTime, setNewBreakTime] = useState(getDefaultBreakTime(startTime, endTime));
  const [newBreakDuration, setNewBreakDuration] = useState(30);

  // Update break time when schedule times change
  useEffect(() => {
    setNewBreakTime(getDefaultBreakTime(startTime, endTime));
  }, [startTime, endTime]);

  // Chunk editing
  const [editingChunk, setEditingChunk] = useState<ScheduleChunk | null>(null);

  // Generate default schedule on mount if no saved state and tasks available
  useEffect(() => {
    if (!savedState && tasks.filter(t => t.hoursCompleted < t.estimatedHours).length > 0) {
      const schedule = generateSchedule({
        tasks,
        startTime,
        endTime,
        breaks,
        defaultChunkSize,
        defaultNagInterval,
        date,
        name: scheduleName || undefined
      });

      if (schedule.chunks.length > 0) {
        setPreviewChunks(schedule.chunks);
        setPreviewSchedule(schedule);
        setShowPreview(true);
      }
    }
  }, []); // Only run on mount

  // Save preview state to localStorage whenever it changes
  useEffect(() => {
    const previewState = {
      scheduleName,
      date,
      startTime,
      endTime,
      breaks,
      defaultChunkSize,
      previewChunks,
      previewSchedule,
      showPreview,
      viewMode,
      selectedTaskIds
    };
    localStorage.setItem('schedule_preview_state', JSON.stringify(previewState));
  }, [scheduleName, date, startTime, endTime, breaks, defaultChunkSize, previewChunks, previewSchedule, showPreview, viewMode]);

  const addBreak = () => {
    if (!newBreakTime) {
      alert('Please set a break time');
      return;
    }

    // Validate break is within schedule time bounds
    const [breakHours, breakMinutes] = newBreakTime.split(':').map(Number);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const breakTotalMinutes = breakHours * 60 + breakMinutes;
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    if (breakTotalMinutes < startTotalMinutes || breakTotalMinutes > endTotalMinutes) {
      alert(`Break time must be between ${startTime} and ${endTime}`);
      return;
    }

    setBreaks([...breaks, {
      id: generateId(),
      time: newBreakTime,
      durationMinutes: newBreakDuration
    }]);
  };

  const removeBreak = (id: string) => {
    setBreaks(breaks.filter(b => b.id !== id));
  };

  const toggleTaskSelection = (taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    }
  };

  const toggleAllTasks = () => {
    if (selectedTaskIds.length === incompleteTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(incompleteTasks.map(t => t.id));
    }
  };

  const handleGenerate = () => {
    if (!startTime || !endTime) {
      alert('Please set start and end times');
      return;
    }

    if (selectedTaskIds.length === 0) {
      alert('Please select at least one task to schedule');
      return;
    }

    // Filter tasks to only include selected ones
    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));

    const schedule = generateSchedule({
      tasks: selectedTasks,
      startTime,
      endTime,
      breaks,
      defaultChunkSize,
      defaultNagInterval,
      date,
      name: scheduleName || undefined
    });

    if (schedule.chunks.length === 0) {
      alert('No tasks available to schedule. Please add some tasks first!');
      return;
    }

    setPreviewChunks(schedule.chunks);
    setPreviewSchedule(schedule);
    setShowPreview(true);
  };

  const handleScheduleUpdate = (updatedSchedule: Schedule) => {
    setPreviewSchedule(updatedSchedule);
    setPreviewChunks(updatedSchedule.chunks);
  };

  // Auto-generate schedule whenever relevant fields change
  useEffect(() => {
    // Only auto-generate if we have the minimum required fields
    if (!startTime || !endTime || selectedTaskIds.length === 0) {
      setShowPreview(false);
      setPreviewChunks([]);
      setPreviewSchedule(null);
      return;
    }

    // Generate schedule automatically
    const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));

    const schedule = generateSchedule({
      tasks: selectedTasks,
      startTime,
      endTime,
      breaks,
      defaultChunkSize,
      defaultNagInterval,
      date,
      name: scheduleName || undefined
    });

    if (schedule.chunks.length > 0) {
      setPreviewChunks(schedule.chunks);
      setPreviewSchedule(schedule);
      setShowPreview(true);
    }
  }, [startTime, endTime, selectedTaskIds, breaks, defaultChunkSize, date, scheduleName, tasks, defaultNagInterval]);

  const handleSave = () => {
    if (previewChunks.length === 0) {
      alert('Please generate a schedule first');
      return;
    }

    const schedule: Schedule = previewSchedule ? {
      ...previewSchedule,
      id: crypto.randomUUID(),
      status: 'active' as const,
      createdAt: new Date().toISOString()
    } : {
      id: crypto.randomUUID(),
      name: scheduleName || undefined,
      date,
      startTime,
      endTime,
      breaks,
      defaultChunkSize,
      status: 'active' as const,
      chunks: previewChunks,
      createdAt: new Date().toISOString()
    };

    onScheduleCreated(schedule);
    setShowPreview(false);
    setPreviewChunks([]);
    setPreviewSchedule(null);

    // Clear preview state from localStorage
    localStorage.removeItem('schedule_preview_state');
  };

  const updateChunkNagInterval = (chunkId: string, newInterval: number) => {
    setPreviewChunks(chunks =>
      chunks.map(chunk =>
        chunk.id === chunkId
          ? { ...chunk, nagIntervalMinutes: Math.max(0, newInterval) }
          : chunk
      )
    );
  };

  const handleChunkClick = (chunk: ScheduleChunk) => {
    setEditingChunk(chunk);
  };

  const handleChunkSave = (updatedChunk: ScheduleChunk) => {
    const chunks = previewChunks.map(c =>
      c.id === updatedChunk.id ? updatedChunk : c
    );

    // Re-sort chunks by start time
    chunks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    setPreviewChunks(chunks);
    if (previewSchedule) {
      setPreviewSchedule({ ...previewSchedule, chunks });
    }
    setEditingChunk(null);
  };

  const handleChunkDelete = () => {
    if (!editingChunk) return;

    const chunks = previewChunks.filter(c => c.id !== editingChunk.id);

    // Recalculate times to fill the gap
    let currentMinutes = timeToMinutes(startTime);
    const updatedChunks = chunks.map((chunk) => {
      const duration = chunk.durationMinutes;
      const newChunk = {
        ...chunk,
        startTime: minutesToTime(currentMinutes),
        endTime: minutesToTime(currentMinutes + duration)
      };
      currentMinutes += duration;
      return newChunk;
    });

    setPreviewChunks(updatedChunks);
    if (previewSchedule) {
      setPreviewSchedule({ ...previewSchedule, chunks: updatedChunks });
    }
    setEditingChunk(null);
  };

  const handleChunkCancel = () => {
    setEditingChunk(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      case 'low':
        return 'border-green-300 bg-green-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const availableTasks = tasks.filter(t => t.hoursCompleted < t.estimatedHours);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Create Schedule</h2>

      {availableTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No tasks available to schedule.</p>
          <p className="mt-2">All tasks are either completed or you haven't created any yet.</p>
        </div>
      ) : (
        <>
          {/* Task Selection */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Select Tasks for This Session</h3>
              <button
                onClick={toggleAllTasks}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedTaskIds.length === incompleteTasks.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {incompleteTasks.map(task => {
                const progress = (task.hoursCompleted / task.estimatedHours) * 100;
                const remaining = task.estimatedHours - task.hoursCompleted;
                const isSelected = selectedTaskIds.includes(task.id);

                return (
                  <label
                    key={task.id}
                    className={`flex items-start p-3 border rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleTaskSelection(task.id)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{task.title}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            task.priority === 'high'
                              ? 'bg-red-100 text-red-700'
                              : task.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Remaining: {remaining.toFixed(1)} {remaining === 1 ? 'hr' : 'hrs'}
                        <span className="mx-2">•</span>
                        Progress: {Math.round(progress)}%
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {selectedTaskIds.length === 0 && (
              <p className="text-sm text-amber-600 mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                Please select at least one task to include in your schedule.
              </p>
            )}
          </div>

          {/* Schedule Configuration */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Schedule Name (optional)</label>
              <input
                type="text"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="e.g., Morning Work Session"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Breaks</label>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-2">
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <input
                      type="time"
                      value={newBreakTime}
                      onChange={(e) => setNewBreakTime(e.target.value)}
                      min={startTime}
                      max={endTime}
                      step="300"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      title={`Break time must be between ${startTime} and ${endTime}`}
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      value={newBreakDuration}
                      onChange={(e) => setNewBreakDuration(parseInt(e.target.value))}
                      min="5"
                      step="5"
                      placeholder="mins"
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addBreak}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    + Add
                  </button>
                </div>

                {breaks.length === 0 ? (
                  <p className="text-xs text-gray-500">No breaks added. Add breaks at specific times.</p>
                ) : (
                  <div className="space-y-1">
                    {breaks.sort((a, b) => a.time.localeCompare(b.time)).map((breakItem) => (
                      <div key={breakItem.id} className="flex items-center justify-between bg-white border border-gray-300 rounded px-2 py-1 text-sm">
                        <span>{formatTime(breakItem.time)} - {breakItem.durationMinutes} minutes</span>
                        <button
                          type="button"
                          onClick={() => removeBreak(breakItem.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Default Chunk Size (minutes)</label>
                <input
                  type="number"
                  value={defaultChunkSize}
                  onChange={(e) => setDefaultChunkSize(parseInt(e.target.value))}
                  min="5"
                  step="5"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Default Nag Interval (minutes)</label>
                <input
                  type="number"
                  value={defaultNagInterval}
                  disabled
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-600"
                  title="Change in settings"
                />
                <p className="text-xs text-gray-500 mt-1">Set in global settings or per-task</p>
              </div>
            </div>

          </div>

          {showPreview && previewSchedule && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold">Schedule Preview ({previewChunks.length} chunks)</h3>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setViewMode('visual')}
                      className={`px-3 py-1 text-sm rounded ${
                        viewMode === 'visual'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      📅 Visual Timeline
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1 text-sm rounded ${
                        viewMode === 'list'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      📋 List View
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 font-medium"
                >
                  Save Schedule
                </button>
              </div>

              {viewMode === 'visual' ? (
                <VisualScheduleEditor
                  schedule={previewSchedule}
                  tasks={tasks}
                  onScheduleUpdate={handleScheduleUpdate}
                />
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {previewChunks.map((chunk, index) => (
                    <div
                      key={chunk.id}
                      onClick={() => handleChunkClick(chunk)}
                      className={`border-l-4 rounded-r p-3 cursor-pointer hover:opacity-80 transition-opacity ${chunk.type === 'break' ? 'border-gray-400 bg-gray-100' : getPriorityColor(chunk.taskPriority)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-gray-600">
                              {formatTime(chunk.startTime)} - {formatTime(chunk.endTime)}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({formatDuration(chunk.durationMinutes)})
                            </span>
                          </div>
                          <p className="font-medium mt-1">
                            {chunk.type === 'break' ? '☕ ' : ''}{chunk.taskTitle}
                          </p>
                        </div>

                        {chunk.type === 'task' && (
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Nag every:</label>
                            <input
                              type="number"
                              value={chunk.nagIntervalMinutes}
                              onChange={(e) => updateChunkNagInterval(chunk.id, parseInt(e.target.value))}
                              min="0"
                              step="5"
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <span className="text-sm text-gray-600">min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingChunk && (
        <ChunkEditModal
          chunk={editingChunk}
          tasks={availableTasks}
          scheduleStartTime={startTime}
          scheduleEndTime={endTime}
          onSave={handleChunkSave}
          onDelete={handleChunkDelete}
          onCancel={handleChunkCancel}
        />
      )}
    </div>
  );
}
