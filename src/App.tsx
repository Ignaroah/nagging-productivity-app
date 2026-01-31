import { useState, useEffect } from 'react';
import TaskList from './components/TaskList';
import ScheduleForm from './components/ScheduleForm';
import ActiveSchedule from './components/ActiveSchedule';
import NaturalLanguageScheduler from './components/NaturalLanguageScheduler';
import LoginButton from './components/LoginButton';
import MigrationPrompt from './components/MigrationPrompt';
import { getTasks, addTask, updateTask, deleteTask, getActiveSchedule, addSchedule, setActiveScheduleId, markChunkComplete, getSettings, saveSettings } from './lib/storage';
import { requestNotificationPermission, startChunkNagging, clearAllNotifications } from './lib/notifications';
import { generateSchedule } from './lib/scheduler';
import { generateId } from './lib/utils';
import { Task, Schedule, AppSettings, ScheduleBreak } from './types';

type Tab = 'tasks' | 'schedule' | 'active' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);

  useEffect(() => {
    loadData();
    setupNotifications();
  }, []);

  useEffect(() => {
    if (activeSchedule) {
      setupScheduleNotifications(activeSchedule);
    }
  }, [activeSchedule]);

  const loadData = () => {
    setTasks(getTasks());
    setActiveSchedule(getActiveSchedule());
  };

  const setupNotifications = async () => {
    const settings = getSettings();
    if (!settings.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        settings.notificationsEnabled = true;
        saveSettings(settings);
      }
    }
  };

  const setupScheduleNotifications = (schedule: Schedule) => {
    // Clear any existing notifications first
    clearAllNotifications();

    // Only set up notifications for the current or next incomplete chunk
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const timeToMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    // Find the current or next incomplete chunk
    const activeChunk = schedule.chunks
      .filter(chunk => !chunk.completed)
      .find(chunk => {
        const endMinutes = timeToMinutes(chunk.endTime);
        return endMinutes > currentTime; // Not yet finished
      });

    if (activeChunk) {
      const result = startChunkNagging(activeChunk, () => {
        setRefreshKey(prev => prev + 1);
      });

      // Store notification info for UI feedback (optional)
      if (result.info.nextNotificationAt) {
        console.log('Next notification at:', result.info.nextNotificationAt);
      }
    }
  };

  const handleTasksChange = () => {
    loadData();
  };

  const handleScheduleCreated = (schedule: Schedule) => {
    addSchedule(schedule);
    setActiveScheduleId(schedule.id);
    setActiveSchedule(schedule);
    setActiveTab('active');
    setupScheduleNotifications(schedule);
  };

  const handleChunkComplete = (chunkId: string) => {
    if (activeSchedule) {
      markChunkComplete(activeSchedule.id, chunkId);
      loadData();

      // Check if schedule is now complete
      const updatedSchedule = getActiveSchedule();
      if (updatedSchedule && updatedSchedule.chunks.every(c => c.completed)) {
        handleScheduleComplete();
      }
    }
  };

  const handleScheduleComplete = () => {
    // Clear all notifications when schedule completes
    clearAllNotifications();

    setShowCompletionMessage(true);
    setActiveScheduleId('');
    setActiveSchedule(null);

    setTimeout(() => {
      setShowCompletionMessage(false);
    }, 5000);
  };

  const handleRefresh = () => {
    loadData();
    setRefreshKey(prev => prev + 1);
  };

  const handleEndSession = () => {
    // Clear all notifications when session is manually ended
    clearAllNotifications();
    setActiveScheduleId('');
    setActiveSchedule(null);
    loadData();
  };

  const handleSettingsChange = (newSettings: AppSettings) => {
    // If timeUnit changed, convert all task values
    if (settings.timeUnit !== newSettings.timeUnit) {
      const tasks = getTasks();
      const conversionFactor = newSettings.timeUnit === 'minutes' ? 60 : 1/60;

      const convertedTasks = tasks.map(task => ({
        ...task,
        estimatedHours: task.estimatedHours * conversionFactor,
        hoursCompleted: task.hoursCompleted * conversionFactor
      }));

      // Save converted tasks
      convertedTasks.forEach(task => updateTask(task));

      // Reload tasks to reflect changes
      setTasks(convertedTasks);
    }

    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleAITasksCreated = (newTasks: Task[]) => {
    newTasks.forEach(task => addTask(task));
    loadData();
  };

  const handleAIScheduleRequested = (config: {
    taskIds: string[];
    startTime: string;
    endTime: string;
    date: string;
    breaks?: Array<{ time: string; duration: number }>;
    chunkSize?: number;
  }) => {
    const selectedTasks = tasks.filter(t => config.taskIds.includes(t.id));

    const breaks: ScheduleBreak[] = (config.breaks || []).map(b => ({
      id: generateId(),
      time: b.time,
      durationMinutes: b.duration
    }));

    const schedule = generateSchedule({
      tasks: selectedTasks,
      startTime: config.startTime,
      endTime: config.endTime,
      breaks,
      defaultChunkSize: config.chunkSize || settings.defaultChunkSize,
      defaultNagInterval: settings.defaultNagInterval,
      date: config.date
    });

    handleScheduleCreated(schedule);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Migration Prompt */}
      <MigrationPrompt />

      {/* Completion Message */}
      {showCompletionMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 shadow-xl max-w-md text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule Complete!</h2>
            <p className="text-gray-600 mb-4">Great job! All tasks in your schedule are done.</p>
            <button
              onClick={() => setShowCompletionMessage(false)}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 font-medium"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Naggle</h1>
            <p className="text-sm text-gray-600 mt-1">Stay on track with scheduled task chunks and persistent reminders</p>
          </div>
          <LoginButton />
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Tasks
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'schedule'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              📅 Create Schedule
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors relative ${
                activeTab === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              ▶️ Active Schedule
              {activeSchedule && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'tasks' && (
          <>
            <div className="p-6 pb-0">
              <NaturalLanguageScheduler
                tasks={tasks}
                onTasksCreated={handleAITasksCreated}
                onScheduleRequested={handleAIScheduleRequested}
              />
            </div>
            <TaskList
              tasks={tasks}
              timeUnit={settings.timeUnit}
              onTasksChange={handleTasksChange}
              onAddTask={addTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
            />
          </>
        )}

        {activeTab === 'schedule' && (
          <ScheduleForm
            tasks={tasks}
            defaultNagInterval={settings.defaultNagInterval}
            onScheduleCreated={handleScheduleCreated}
          />
        )}

        {activeTab === 'active' && (
          <ActiveSchedule
            key={refreshKey}
            schedule={activeSchedule}
            onChunkComplete={handleChunkComplete}
            onRefresh={handleRefresh}
            onEndSession={handleEndSession}
          />
        )}

        {activeTab === 'settings' && (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>
            <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Time Unit for Tasks
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={settings.timeUnit === 'hours'}
                        onChange={() => handleSettingsChange({ ...settings, timeUnit: 'hours' })}
                        className="mr-2"
                      />
                      Hours
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={settings.timeUnit === 'minutes'}
                        onChange={() => handleSettingsChange({ ...settings, timeUnit: 'minutes' })}
                        className="mr-2"
                      />
                      Minutes
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose how you want to estimate and track time for tasks
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Default Chunk Size (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.defaultChunkSize}
                    onChange={(e) => handleSettingsChange({ ...settings, defaultChunkSize: parseInt(e.target.value) })}
                    min="5"
                    step="5"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Default size for schedule chunks when creating a new schedule
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Default Nag Interval (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.defaultNagInterval}
                    onChange={(e) => handleSettingsChange({ ...settings, defaultNagInterval: parseInt(e.target.value) })}
                    min="0"
                    step="1"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How often to send reminders during active chunks (0 = no reminders). Can be overridden per-task.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Default Break Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.defaultBreakDuration}
                    onChange={(e) => handleSettingsChange({ ...settings, defaultBreakDuration: parseInt(e.target.value) })}
                    min="0"
                    step="5"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Default duration for breaks when creating schedules
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    <strong>Notifications:</strong> {settings.notificationsEnabled ? '✓ Enabled' : '✗ Disabled'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Notification permission is requested when you first use the app
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
