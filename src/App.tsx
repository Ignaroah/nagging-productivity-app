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
    <div className="min-h-screen bg-[var(--dark-bg)]">
      {/* Migration Prompt */}
      <MigrationPrompt />

      {/* Completion Message */}
      {showCompletionMessage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm">
          <div className="relative bg-[var(--dark-elevated)] border border-[var(--neon-pink)]/30 rounded-2xl p-8 shadow-2xl max-w-md text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-pink)]/10 to-[var(--neon-cyan)]/10"></div>
            <div className="relative z-10">
              <div className="text-7xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-3xl font-black mb-2 text-gradient">MISSION COMPLETE!</h2>
              <p className="text-[var(--text-secondary)] mb-6 font-medium">All tasks conquered. You're unstoppable! 🚀</p>
              <button
                onClick={() => setShowCompletionMessage(false)}
                className="bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-cyan)] text-black px-8 py-3 rounded-xl font-black hover:shadow-[0_0_30px_rgba(255,10,120,0.5)] transition-all"
              >
                LET'S GO!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative bg-[var(--dark-elevated)] border-b border-[var(--border-subtle)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--neon-pink)]/5 via-transparent to-[var(--neon-cyan)]/5"></div>
        <div className="grain-texture absolute inset-0"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-cyan)] rounded-xl blur-lg opacity-30"></div>
              <div className="relative bg-[var(--dark-card)] p-3 rounded-xl border border-[var(--neon-pink)]/30">
                <svg className="w-8 h-8 text-[var(--neon-pink)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-gradient" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                NAGGLE
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
                Stay on track • Get nagged • Stay productive
              </p>
            </div>
          </div>
          <LoginButton />
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-[var(--dark-card)] border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`relative px-6 py-4 font-bold text-sm tracking-wide transition-all duration-300 ${
                activeTab === 'tasks'
                  ? 'text-[var(--neon-pink)]'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {activeTab === 'tasks' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--neon-pink)] to-transparent neon-glow"></div>
              )}
              <span className="relative z-10">📋 TASKS</span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`relative px-6 py-4 font-bold text-sm tracking-wide transition-all duration-300 ${
                activeTab === 'schedule'
                  ? 'text-[var(--neon-cyan)]'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {activeTab === 'schedule' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--neon-cyan)] to-transparent neon-glow-cyan"></div>
              )}
              <span className="relative z-10">📅 CREATE</span>
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`relative px-6 py-4 font-bold text-sm tracking-wide transition-all duration-300 ${
                activeTab === 'active'
                  ? 'text-[var(--neon-pink)]'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {activeTab === 'active' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--neon-pink)] to-transparent neon-glow"></div>
              )}
              <span className="relative z-10 flex items-center gap-2">
                ▶️ ACTIVE
                {activeSchedule && (
                  <span className="w-2 h-2 bg-[var(--neon-cyan)] rounded-full pulse-nag shadow-[0_0_10px_var(--neon-cyan)]"></span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`relative px-6 py-4 font-bold text-sm tracking-wide transition-all duration-300 ${
                activeTab === 'settings'
                  ? 'text-[var(--neon-pink)]'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {activeTab === 'settings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--neon-pink)] to-transparent neon-glow"></div>
              )}
              <span className="relative z-10">⚙️ SETTINGS</span>
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
