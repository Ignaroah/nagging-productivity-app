import { useState } from 'react';
import { ScheduleChunk, Task } from '../types';
import { formatTime, timeToMinutes, minutesToTime } from '../lib/utils';

interface ChunkEditModalProps {
  chunk: ScheduleChunk;
  tasks: Task[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  onSave: (updatedChunk: ScheduleChunk) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function ChunkEditModal({
  chunk,
  tasks,
  scheduleStartTime,
  scheduleEndTime,
  onSave,
  onDelete,
  onCancel
}: ChunkEditModalProps) {
  const [startTime, setStartTime] = useState(chunk.startTime);
  const [endTime, setEndTime] = useState(chunk.endTime);
  const [nagInterval, setNagInterval] = useState(chunk.nagIntervalMinutes);
  const [selectedTaskId, setSelectedTaskId] = useState(chunk.taskId);

  const handleSave = () => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const duration = endMinutes - startMinutes;

    if (duration < 5) {
      alert('Duration must be at least 5 minutes');
      return;
    }

    if (startMinutes < timeToMinutes(scheduleStartTime) || endMinutes > timeToMinutes(scheduleEndTime)) {
      alert('Chunk times must be within schedule boundaries');
      return;
    }

    const selectedTask = tasks.find(t => t.id === selectedTaskId);

    const updatedChunk: ScheduleChunk = {
      ...chunk,
      startTime,
      endTime,
      durationMinutes: duration,
      nagIntervalMinutes: Math.max(0, nagInterval),
      taskId: selectedTaskId || chunk.taskId,
      taskTitle: selectedTask?.title || chunk.taskTitle,
      taskPriority: selectedTask?.priority || chunk.taskPriority
    };

    onSave(updatedChunk);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this chunk?')) {
      onDelete();
    }
  };

  const isBreak = chunk.type === 'break';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          Edit {isBreak ? 'Break' : 'Task Chunk'}
        </h2>

        <div className="space-y-4">
          {!isBreak && tasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Task</label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {tasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title} ({task.priority})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Duration: {timeToMinutes(endTime) - timeToMinutes(startTime)} minutes
            </label>
            <p className="text-xs text-gray-500">
              {formatTime(startTime)} - {formatTime(endTime)}
            </p>
          </div>

          {!isBreak && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Nag Interval (minutes)
              </label>
              <input
                type="number"
                value={nagInterval}
                onChange={(e) => setNagInterval(parseInt(e.target.value))}
                min="0"
                step="1"
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                0 = no reminders during this chunk
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 font-medium"
            >
              Save Changes
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white rounded px-4 py-2 hover:bg-red-600 font-medium"
            >
              Delete
            </button>
            <button
              onClick={onCancel}
              className="bg-gray-200 text-gray-800 rounded px-4 py-2 hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
