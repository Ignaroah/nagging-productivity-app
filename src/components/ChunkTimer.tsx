import { useState, useEffect } from 'react';
import { ScheduleChunk } from '../types';
import { timeToMinutes } from '../lib/utils';

interface ChunkTimerProps {
  chunk: ScheduleChunk;
  onComplete: () => void;
}

export default function ChunkTimer({ chunk, onComplete }: ChunkTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [secondsUntilNextNag, setSecondsUntilNextNag] = useState<number | null>(null);

  useEffect(() => {
    const calculateRemaining = () => {
      const now = new Date();

      // Calculate time remaining in chunk
      const [endHours, endMinutes] = chunk.endTime.split(':').map(Number);
      const endTime = new Date(now);
      endTime.setHours(endHours, endMinutes, 0, 0);

      const diff = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
      setRemainingSeconds(diff);

      // Calculate time until next nag
      if (chunk.nagIntervalMinutes > 0) {
        const [startHours, startMinutes] = chunk.startTime.split(':').map(Number);
        const chunkStart = new Date(now);
        chunkStart.setHours(startHours, startMinutes, 0, 0);

        const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - chunkStart.getTime()) / 1000));
        const nagIntervalSeconds = chunk.nagIntervalMinutes * 60;

        // Calculate how many nag intervals have passed
        const nagsElapsed = Math.floor(elapsedSeconds / nagIntervalSeconds);
        const nextNagAt = (nagsElapsed + 1) * nagIntervalSeconds;
        const secondsToNextNag = Math.max(0, nextNagAt - elapsedSeconds);

        // Only show if there's time until next nag and we're within the chunk
        if (secondsToNextNag > 0 && diff > 0) {
          setSecondsUntilNextNag(Math.min(secondsToNextNag, diff));
        } else {
          setSecondsUntilNextNag(null);
        }
      } else {
        setSecondsUntilNextNag(null);
      }

      if (diff === 0) {
        // Timer ended
        setTimeout(onComplete, 1000);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [chunk, onComplete]);

  const formatTimeRemaining = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSeconds = chunk.durationMinutes * 60;
  const elapsed = totalSeconds - remainingSeconds;
  const progressPercent = (elapsed / totalSeconds) * 100;

  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
      <div className="text-center mb-4">
        <p className="text-sm opacity-90 mb-1">Current Task</p>
        <h3 className="text-2xl font-bold">{chunk.taskTitle}</h3>
      </div>

      <div className="text-center mb-6">
        <div className="text-6xl font-mono font-bold">
          {formatTimeRemaining(remainingSeconds)}
        </div>
        <p className="text-sm opacity-90 mt-2">remaining</p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-blue-400 bg-opacity-30 rounded-full h-3 mb-4">
        <div
          className="bg-white rounded-full h-3 transition-all duration-1000"
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>

      {/* Time until next nag */}
      {secondsUntilNextNag !== null && chunk.nagIntervalMinutes > 0 && (
        <div className="text-center mb-4 p-2 bg-blue-400 bg-opacity-30 rounded">
          <p className="text-sm opacity-90">Next reminder in</p>
          <p className="font-mono font-bold text-lg">
            {formatTimeRemaining(secondsUntilNextNag)}
          </p>
        </div>
      )}

      <button
        onClick={onComplete}
        className="w-full bg-white text-blue-600 px-4 py-3 rounded font-bold hover:bg-blue-50 transition-colors"
      >
        ✓ I'm done!
      </button>
    </div>
  );
}
