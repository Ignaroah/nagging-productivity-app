import { useState } from 'react';
import { Task, Schedule } from '../types';
import { generateId } from '../lib/utils';
import { api, isAuthenticated } from '../lib/api';

interface NaturalLanguageSchedulerProps {
  tasks: Task[];
  onTasksCreated: (tasks: Task[]) => void;
  onScheduleRequested: (config: {
    taskIds: string[];
    startTime: string;
    endTime: string;
    date: string;
    breaks?: Array<{ time: string; duration: number }>;
    chunkSize?: number;
  }) => void;
}

export default function NaturalLanguageScheduler({
  tasks,
  onTasksCreated,
  onScheduleRequested
}: NaturalLanguageSchedulerProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem('anthropic_api_key') || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingActions, setPendingActions] = useState<{
    newTasks: Task[];
    selectedTaskIds: string[];
    scheduleConfig: any;
  } | null>(null);

  const processAIResponse = (data: any) => {
    // Check if response has the expected structure
    if (!data || !data.content || !data.content[0] || !data.content[0].text) {
      console.error('Invalid API response structure:', data);
      throw new Error(`Invalid API response: ${JSON.stringify(data)}`);
    }

    const content = data.content[0].text;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI response text:', content);
      throw new Error('Could not parse AI response as JSON. Response: ' + content.substring(0, 200));
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Create new tasks
    const newTasks: Task[] = [];
    const selectedTaskIds: string[] = [];

    for (const taskDef of parsed.tasks || []) {
      if (taskDef.useExisting && typeof taskDef.useExisting === 'string') {
        // Use existing task
        selectedTaskIds.push(taskDef.useExisting);
      } else {
        // Create new task
        const newTask: Task = {
          id: generateId(),
          title: taskDef.title,
          estimatedHours: (taskDef.estimatedTime || 30) / 60,
          hoursCompleted: 0,
          priority: taskDef.priority || 'medium',
          createdAt: new Date().toISOString()
        };
        newTasks.push(newTask);
        selectedTaskIds.push(newTask.id);
      }
    }

    // Show confirmation modal instead of immediately executing
    const today = new Date().toISOString().split('T')[0];
    const scheduleConfig = parsed.schedule ? {
      taskIds: selectedTaskIds,
      startTime: parsed.schedule.startTime || '09:00',
      endTime: parsed.schedule.endTime || '17:00',
      date: parsed.schedule.date || today,
      breaks: parsed.schedule.breaks || [],
      chunkSize: parsed.schedule.chunkSize || 30
    } : null;

    setPendingActions({
      newTasks,
      selectedTaskIds,
      scheduleConfig
    });
    setShowConfirmModal(true);
    setInput('');
  };

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) return;

    // If authenticated, save to backend (encrypted)
    if (isAuthenticated()) {
      try {
        await api.put('/api/settings/api-key', { apiKey: apiKey.trim() });
        setShowApiKeyInput(false);
        setError(null);
      } catch (err) {
        setError('Failed to save API key to backend');
        console.error(err);
      }
    } else {
      // Fallback to localStorage if not authenticated
      localStorage.setItem('anthropic_api_key', apiKey.trim());
      setShowApiKeyInput(false);
    }
  };

  const handleConfirm = () => {
    if (!pendingActions) return;

    // Create new tasks
    if (pendingActions.newTasks.length > 0) {
      onTasksCreated(pendingActions.newTasks);
    }

    // Create schedule if configured
    if (pendingActions.scheduleConfig) {
      onScheduleRequested(pendingActions.scheduleConfig);
    }

    // Close modal and reset
    setShowConfirmModal(false);
    setPendingActions(null);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
    setPendingActions(null);
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    // Always use backend proxy to avoid CORS issues
    setLoading(true);
    setError(null);

    try {
      const requestBody: any = {
        input: input.trim(),
        tasks: tasks
      };

      // If not authenticated, include API key in request (will be used temporarily)
      if (!isAuthenticated()) {
        if (!apiKey.trim()) {
          setError('Please enter your Anthropic API key first');
          setShowApiKeyInput(true);
          setLoading(false);
          return;
        }
        requestBody.apiKey = apiKey.trim();
      }

      const data = await api.post('/api/ai/generate', requestBody);
      processAIResponse(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process request';
      setError(errorMsg);

      // If error is about missing API key, show the input
      if (errorMsg.includes('No API key') || errorMsg.includes('API key')) {
        setShowApiKeyInput(true);
      }

      // If backend is not running, show helpful error
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        setError('Cannot connect to backend server. Please make sure the backend is running on http://localhost:3001');
      }
    } finally {
      setLoading(false);
    }
  };

  if (showApiKeyInput) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">🤖 My Nagger Setup</h3>
        <p className="text-sm text-gray-700 mb-3">
          Enter your Anthropic API key to use natural language scheduling. Get one at{' '}
          <a
            href="https://console.anthropic.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            console.anthropic.com
          </a>
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 border border-gray-300 rounded px-3 py-2"
          />
          <button
            onClick={handleApiKeySubmit}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 font-medium"
          >
            Save
          </button>
        </div>
        {apiKey && (
          <button
            onClick={() => setShowApiKeyInput(false)}
            className="mt-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">🤖 My Nagger</h3>
          <p className="text-sm text-gray-700 mt-1">
            Describe what you want to work on in natural language
          </p>
        </div>
        <button
          onClick={() => setShowApiKeyInput(true)}
          className="text-sm px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700 flex items-center gap-1"
          title="Change API key"
        >
          ⚙️ Change Key
        </button>
      </div>

      <div className="space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try: "Work on my report for 2 hours and do code review from 2pm to 4pm with a break at 3pm"'
          className="w-full border border-gray-300 rounded px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          disabled={loading}
        />

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="flex-1 bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Generate Tasks & Schedule'}
          </button>
        </div>

        <div className="text-xs text-gray-600">
          <details>
            <summary className="cursor-pointer hover:text-gray-800">Examples</summary>
            <ul className="mt-2 space-y-1 ml-4 list-disc">
              <li>"Create tasks for writing a blog post (2 hours), editing photos (1 hour), and responding to emails (30 minutes)"</li>
              <li>"Schedule my existing tasks from 9am to 5pm with lunch at 12:30 for 30 minutes"</li>
              <li>"Work on the report and code review tasks tomorrow from 2pm to 6pm"</li>
              <li>"Add a high priority task to prepare presentation (3 hours) and schedule it for today"</li>
            </ul>
          </details>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingActions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">🤖 Confirm Plan from My Nagger</h2>

            <div className="space-y-4 mb-6">
              {/* New Tasks Section */}
              {pendingActions.newTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">✨ New Tasks to Create ({pendingActions.newTasks.length})</h3>
                  <div className="space-y-2">
                    {pendingActions.newTasks.map((task, index) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{task.title}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Estimated: {(task.estimatedHours * 60).toFixed(0)} minutes
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Tasks Section */}
              {pendingActions.selectedTaskIds.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">📋 Existing Tasks to Include ({
                    pendingActions.selectedTaskIds.filter(id =>
                      !pendingActions.newTasks.some(t => t.id === id)
                    ).length
                  })</h3>
                  <div className="space-y-2">
                    {pendingActions.selectedTaskIds
                      .filter(id => !pendingActions.newTasks.some(t => t.id === id))
                      .map(taskId => {
                        const task = tasks.find(t => t.id === taskId);
                        if (!task) return null;
                        return (
                          <div key={taskId} className="bg-gray-50 border border-gray-200 rounded p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{task.title}</span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  Remaining: {((task.estimatedHours - task.hoursCompleted) * 60).toFixed(0)} minutes
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Schedule Configuration Section */}
              {pendingActions.scheduleConfig && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">📅 Schedule Configuration</h3>
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Date:</span> {pendingActions.scheduleConfig.date}
                      </div>
                      <div>
                        <span className="font-medium">Time:</span> {pendingActions.scheduleConfig.startTime} - {pendingActions.scheduleConfig.endTime}
                      </div>
                      <div>
                        <span className="font-medium">Chunk Size:</span> {pendingActions.scheduleConfig.chunkSize} minutes
                      </div>
                      {pendingActions.scheduleConfig.breaks && pendingActions.scheduleConfig.breaks.length > 0 && (
                        <div className="col-span-2">
                          <span className="font-medium">Breaks:</span>
                          {pendingActions.scheduleConfig.breaks.map((b: any, i: number) => (
                            <span key={i} className="ml-2">
                              {b.time} ({b.duration} min)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!pendingActions.scheduleConfig && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">
                    ℹ️ Tasks will be created but no schedule will be generated. You can manually create a schedule later.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-medium"
              >
                Confirm & Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
