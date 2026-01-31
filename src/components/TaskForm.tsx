import { useState, useEffect } from 'react';
import { Task } from '../types';
import { generateId } from '../lib/utils';

interface TaskFormProps {
  task?: Task;
  timeUnit: 'hours' | 'minutes';
  onSave: (task: Task) => void;
  onCancel: () => void;
}

export default function TaskForm({ task, timeUnit, onSave, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || '');
  // Display values in the selected time unit (hours or minutes)
  const [estimatedValue, setEstimatedValue] = useState(
    timeUnit === 'minutes' ? (task?.estimatedHours || 1) * 60 : (task?.estimatedHours || 1)
  );
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(task?.priority || 'medium');
  const [completedValue, setCompletedValue] = useState(
    timeUnit === 'minutes' ? (task?.hoursCompleted || 0) * 60 : (task?.hoursCompleted || 0)
  );
  const [defaultNagInterval, setDefaultNagInterval] = useState(task?.defaultNagInterval || 0);
  const [defaultChunkSize, setDefaultChunkSize] = useState(task?.defaultChunkSize || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please enter a task title');
      return;
    }

    if (estimatedValue <= 0) {
      alert(`Estimated ${timeUnit} must be greater than 0`);
      return;
    }

    // Convert display values to hours for storage (internal format is always hours)
    const estimatedHours = timeUnit === 'minutes' ? estimatedValue / 60 : estimatedValue;
    const hoursCompleted = timeUnit === 'minutes' ? completedValue / 60 : completedValue;

    const newTask: Task = {
      id: task?.id || generateId(),
      title: title.trim(),
      priority,
      estimatedHours,
      hoursCompleted: Math.min(hoursCompleted, estimatedHours),
      defaultNagInterval: defaultNagInterval > 0 ? defaultNagInterval : undefined,
      defaultChunkSize: defaultChunkSize > 0 ? defaultChunkSize : undefined,
      createdAt: task?.createdAt || new Date().toISOString()
    };

    onSave(newTask);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          {task ? 'Edit Task' : 'New Task'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Task title"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Estimated {timeUnit === 'hours' ? 'Hours' : 'Minutes'}
            </label>
            <input
              type="number"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(parseFloat(e.target.value))}
              min="0"
              step="any"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {task && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {timeUnit === 'hours' ? 'Hours' : 'Minutes'} Completed
              </label>
              <input
                type="number"
                value={completedValue}
                onChange={(e) => setCompletedValue(parseFloat(e.target.value))}
                min="0"
                step="any"
                max={estimatedValue}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Default Nag Interval (minutes)
              <span className="text-xs text-gray-500 ml-1">(0 = use global default)</span>
            </label>
            <input
              type="number"
              value={defaultNagInterval}
              onChange={(e) => setDefaultNagInterval(parseInt(e.target.value))}
              min="0"
              step="1"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Default Chunk Size (minutes)
              <span className="text-xs text-gray-500 ml-1">(0 = use global default)</span>
            </label>
            <input
              type="number"
              value={defaultChunkSize}
              onChange={(e) => setDefaultChunkSize(parseInt(e.target.value))}
              min="0"
              step="5"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-800 rounded px-4 py-2 hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
