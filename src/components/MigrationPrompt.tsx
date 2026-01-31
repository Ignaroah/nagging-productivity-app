import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { getTasks, getSchedules, getSettings } from '../lib/storage';

const STORAGE_KEYS = {
  tasks: 'nagging_app_tasks',
  schedules: 'nagging_app_schedules',
  activeScheduleId: 'nagging_app_active_schedule',
  settings: 'nagging_app_settings',
  migrated: 'nagging_app_migrated'
};

function hasLocalStorageData(): boolean {
  const tasks = localStorage.getItem(STORAGE_KEYS.tasks);
  const schedules = localStorage.getItem(STORAGE_KEYS.schedules);
  return !!(tasks && tasks !== '[]') || !!(schedules && schedules !== '[]');
}

function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEYS.tasks);
  localStorage.removeItem(STORAGE_KEYS.schedules);
  localStorage.removeItem(STORAGE_KEYS.activeScheduleId);
  localStorage.removeItem(STORAGE_KEYS.settings);
}

export default function MigrationPrompt() {
  const [show, setShow] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if user just logged in and has localStorage data
    if (isAuthenticated && hasLocalStorageData()) {
      const alreadyMigrated = localStorage.getItem(STORAGE_KEYS.migrated);
      if (!alreadyMigrated) {
        setShow(true);
      }
    }
  }, [isAuthenticated]);

  const handleMigrate = async () => {
    setMigrating(true);
    setError(null);

    try {
      const data = {
        tasks: getTasks(),
        schedules: getSchedules(),
        settings: getSettings(),
        activeScheduleId: localStorage.getItem(STORAGE_KEYS.activeScheduleId) || undefined
      };

      const result = await api.post<{
        success: boolean;
        migrated: { tasks: number; schedules: number; settings: boolean };
      }>('/api/migrate', data);

      if (result.success) {
        // Mark as migrated
        localStorage.setItem(STORAGE_KEYS.migrated, 'true');

        // Ask if user wants to clear local data
        if (confirm(
          `Successfully imported ${result.migrated.tasks} tasks and ${result.migrated.schedules} schedules!\n\n` +
          'Would you like to clear your local data now that it\'s backed up to the cloud?'
        )) {
          clearLocalStorage();
        }

        setShow(false);
        window.location.reload(); // Reload to fetch from backend
      }
    } catch (err: any) {
      console.error('Migration error:', err);
      setError(err.message || 'Failed to migrate data. Your local data is safe.');
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEYS.migrated, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Import Local Data?</h2>

        <p className="text-gray-600 mb-4">
          We found tasks and schedules stored locally on this device. Would you like to import them to your account?
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <p className="text-sm text-blue-900">
            Your data will be backed up to the cloud and synced across all your devices.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-sm text-red-900">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {migrating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Importing...
              </span>
            ) : (
              'Import Data'
            )}
          </button>
          <button
            onClick={handleSkip}
            disabled={migrating}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Skip
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3 text-center">
          You can always migrate later from Settings
        </p>
      </div>
    </div>
  );
}
