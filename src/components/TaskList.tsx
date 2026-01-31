import { useState } from 'react';
import { Task } from '../types';
import TaskForm from './TaskForm';

interface TaskListProps {
  tasks: Task[];
  timeUnit: 'hours' | 'minutes';
  onTasksChange: () => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskList({
  tasks,
  timeUnit,
  onTasksChange,
  onAddTask,
  onUpdateTask,
  onDeleteTask
}: TaskListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  const handleSave = (task: Task) => {
    if (editingTask) {
      onUpdateTask(task);
    } else {
      onAddTask(task);
    }
    setShowForm(false);
    setEditingTask(undefined);
    onTasksChange();
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      onDeleteTask(taskId);
      onTasksChange();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <button
          onClick={() => {
            setEditingTask(undefined);
            setShowForm(true);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-medium"
        >
          + Add Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No tasks yet. Create your first task to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const progress = task.hoursCompleted / task.estimatedHours;
            const progressPercent = Math.min(progress * 100, 100);
            const isComplete = task.hoursCompleted >= task.estimatedHours;

            return (
              <div
                key={task.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold text-lg ${isComplete ? 'line-through text-gray-500' : ''}`}>
                        {task.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {timeUnit === 'minutes'
                        ? `${(task.hoursCompleted * 60).toFixed(0)} / ${(task.estimatedHours * 60).toFixed(0)}`
                        : `${task.hoursCompleted.toFixed(1)} / ${task.estimatedHours.toFixed(1)}`
                      } {timeUnit}
                      {isComplete && <span className="ml-2 text-green-600 font-medium">✓ Complete</span>}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(task)}
                      className="text-blue-500 hover:text-blue-700 px-2 py-1 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-red-500 hover:text-red-700 px-2 py-1 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TaskForm
          task={editingTask}
          timeUnit={timeUnit}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(undefined);
          }}
        />
      )}
    </div>
  );
}
