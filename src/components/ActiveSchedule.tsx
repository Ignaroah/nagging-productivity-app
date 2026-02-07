import { useEffect, useState } from 'react';
import { Schedule, ScheduleChunk } from '../types';
import { formatTime, formatDuration, getCurrentTime, timeToMinutes } from '../lib/utils';
import ChunkTimer from './ChunkTimer';

interface ActiveScheduleProps {
  schedule: Schedule | null;
  onChunkComplete: (chunkId: string) => void;
  onRefresh: () => void;
  onEndSession: () => void;
}

export default function ActiveSchedule({ schedule, onChunkComplete, onRefresh, onEndSession }: ActiveScheduleProps) {
  const [currentTime, setCurrentTime] = useState(getCurrentTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  if (!schedule) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Active Schedule</h2>
        <div className="text-center py-12 text-gray-500">
          <p>No active schedule.</p>
          <p className="mt-2">Create a schedule to get started!</p>
        </div>
      </div>
    );
  }

  const getCurrentChunk = (): ScheduleChunk | null => {
    const currentMinutes = timeToMinutes(currentTime);
    return schedule.chunks.find(chunk => {
      const startMinutes = timeToMinutes(chunk.startTime);
      const endMinutes = timeToMinutes(chunk.endTime);
      return currentMinutes >= startMinutes && currentMinutes < endMinutes && !chunk.completed;
    }) || null;
  };

  const currentChunk = getCurrentChunk();

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

  const isChunkInPast = (chunk: ScheduleChunk): boolean => {
    return timeToMinutes(currentTime) > timeToMinutes(chunk.endTime);
  };

  const isChunkCurrent = (chunk: ScheduleChunk): boolean => {
    return chunk.id === currentChunk?.id;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Active Schedule</h2>
          <p className="text-sm text-gray-600">
            {schedule.date} • {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Current time: <span className="font-mono font-bold">{formatTime(currentTime)}</span>
          </div>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to end this session? All incomplete chunks will remain incomplete.')) {
                onEndSession();
              }
            }}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-medium text-sm"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Current chunk timer */}
      {currentChunk && (
        <div className="mb-6">
          <ChunkTimer
            chunk={currentChunk}
            onComplete={() => {
              onChunkComplete(currentChunk.id);
              onRefresh();
            }}
          />
        </div>
      )}

      {/* Visual Timeline */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-bold mb-4">Timeline</h3>
        <div className="flex gap-4 max-h-[600px] overflow-y-auto">
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 relative" style={{ height: `${Math.max(400, (timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) * (
            (timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) < 30 ?
            Math.max(400 / (timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)), 10) :
            (timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) < 120 ? 5 :
            (timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) < 240 ? 3 : 2
          ))}px` }}>
            {(() => {
              const startMinutes = timeToMinutes(schedule.startTime);
              const endMinutes = timeToMinutes(schedule.endTime);
              const totalMinutes = endMinutes - startMinutes;
              const pixelsPerMinute = totalMinutes < 30 ? Math.max(400 / totalMinutes, 10) :
                                      totalMinutes < 120 ? 5 :
                                      totalMinutes < 240 ? 3 : 2;

              const markers: number[] = [];
              const startHour = Math.floor(startMinutes / 60);
              const endHour = Math.ceil(endMinutes / 60);
              for (let h = startHour; h <= endHour; h++) {
                markers.push(h * 60);
              }

              return markers.map(minutes => {
                const offsetFromStart = (minutes - startMinutes) * pixelsPerMinute;
                return (
                  <div
                    key={minutes}
                    className="absolute text-xs text-gray-500"
                    style={{ top: `${offsetFromStart}px` }}
                  >
                    {formatTime(`${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, '0')}`)}
                  </div>
                );
              });
            })()}
          </div>

          {/* Timeline grid and chunks */}
          <div className="flex-1 relative border-l border-gray-200">
            <div
              className="relative"
              style={{ height: `${Math.max(400, (timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) * (
                (timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) < 30 ?
                Math.max(400 / (timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)), 10) :
                (timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) < 120 ? 5 :
                (timeToMinutes(schedule.endTime) - timeToMinutes(schedule.startTime)) < 240 ? 3 : 2
              ))}px` }}
            >
              {(() => {
                const startMinutes = timeToMinutes(schedule.startTime);
                const endMinutes = timeToMinutes(schedule.endTime);
                const totalMinutes = endMinutes - startMinutes;
                const pixelsPerMinute = totalMinutes < 30 ? Math.max(400 / totalMinutes, 10) :
                                        totalMinutes < 120 ? 5 :
                                        totalMinutes < 240 ? 3 : 2;

                // Hour grid lines
                const markers: number[] = [];
                const startHour = Math.floor(startMinutes / 60);
                const endHour = Math.ceil(endMinutes / 60);
                for (let h = startHour; h <= endHour; h++) {
                  markers.push(h * 60);
                }

                return (
                  <>
                    {/* Grid lines */}
                    {markers.map(minutes => {
                      const offsetFromStart = (minutes - startMinutes) * pixelsPerMinute;
                      return (
                        <div
                          key={`grid-${minutes}`}
                          className="absolute w-full border-t border-gray-200"
                          style={{ top: `${offsetFromStart}px` }}
                        />
                      );
                    })}

                    {/* Chunks */}
                    {schedule.chunks.map((chunk) => {
                      const chunkStartMinutes = timeToMinutes(chunk.startTime);
                      const chunkEndMinutes = timeToMinutes(chunk.endTime);
                      const top = (chunkStartMinutes - startMinutes) * pixelsPerMinute;
                      const height = (chunkEndMinutes - chunkStartMinutes) * pixelsPerMinute;
                      const isBreak = chunk.type === 'break';
                      const isCurrent = isChunkCurrent(chunk);

                      return (
                        <div
                          key={chunk.id}
                          className={`absolute left-0 right-0 mx-2 border-2 rounded ${
                            chunk.completed ? 'bg-green-500 border-green-600 opacity-60' :
                            isCurrent ? 'bg-blue-500 border-blue-600 ring-2 ring-blue-300' :
                            isBreak ? 'bg-gray-300 border-gray-500' :
                            chunk.taskPriority === 'high' ? 'bg-red-400 border-red-600' :
                            chunk.taskPriority === 'medium' ? 'bg-yellow-400 border-yellow-600' :
                            'bg-green-400 border-green-600'
                          }`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                          title={`${chunk.taskTitle} (${formatTime(chunk.startTime)} - ${formatTime(chunk.endTime)})`}
                        >
                          <div className="p-2 text-sm overflow-hidden h-full flex items-center justify-center text-gray-900">
                            {height >= 40 ? (
                              <div className="w-full overflow-hidden text-center">
                                <div className="font-semibold truncate text-xs">
                                  {chunk.taskTitle}
                                </div>
                                {height >= 60 && (
                                  <div className="text-xs mt-1 truncate">
                                    {formatTime(chunk.startTime)} - {formatTime(chunk.endTime)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs truncate">{chunk.taskTitle.substring(0, 15)}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Current time indicator */}
                    {(() => {
                      const currentMinutes = timeToMinutes(currentTime);
                      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                        const currentOffset = (currentMinutes - startMinutes) * pixelsPerMinute;
                        return (
                          <div
                            className="absolute left-0 right-0 z-10"
                            style={{ top: `${currentOffset}px` }}
                          >
                            <div className="relative">
                              <div className="absolute left-0 w-3 h-3 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-lg"></div>
                              <div className="h-0.5 bg-red-500 shadow-md"></div>
                              <div className="absolute right-2 -translate-y-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded font-bold shadow-lg">
                                NOW
                              </div>
                            </div>
                          </div>
                        );
                      } else if (currentMinutes < startMinutes) {
                        return (
                          <div className="absolute top-0 left-0 right-0 bg-blue-100 border-t-2 border-blue-500 px-4 py-2 text-center text-sm text-blue-700 font-medium">
                            ⏰ Schedule starts in {Math.round((startMinutes - currentMinutes))} minutes
                          </div>
                        );
                      } else {
                        return (
                          <div className="absolute bottom-0 left-0 right-0 bg-gray-100 border-b-2 border-gray-500 px-4 py-2 text-center text-sm text-gray-700 font-medium">
                            ✓ Schedule ended {Math.round((currentMinutes - endMinutes))} minutes ago
                          </div>
                        );
                      }
                    })()}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule chunks list */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-bold mb-4">All Chunks ({schedule.chunks.length})</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {schedule.chunks.map((chunk) => {
            const isCurrent = isChunkCurrent(chunk);
            const inPast = isChunkInPast(chunk);

            return (
              <div
                key={chunk.id}
                className={`
                  border-l-4 rounded-r p-3 transition-all
                  ${chunk.completed ? 'border-green-500 bg-green-50 opacity-60' :
                    isCurrent ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' :
                    chunk.type === 'break' ? 'border-gray-400 bg-gray-100' :
                    getPriorityColor(chunk.taskPriority)
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-mono text-sm ${isCurrent ? 'font-bold text-blue-600' : 'text-gray-600'}`}>
                        {formatTime(chunk.startTime)} - {formatTime(chunk.endTime)}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({formatDuration(chunk.durationMinutes)})
                      </span>
                      {isCurrent && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-bold">
                          ACTIVE
                        </span>
                      )}
                      {chunk.completed && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                          ✓ Complete
                        </span>
                      )}
                    </div>
                    <p className={`font-medium ${chunk.completed ? 'line-through' : ''}`}>
                      {chunk.type === 'break' ? '☕ ' : ''}{chunk.taskTitle}
                    </p>
                    {chunk.type === 'task' && chunk.nagIntervalMinutes > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        🔔 Nag every {chunk.nagIntervalMinutes} minutes
                      </p>
                    )}
                  </div>

                  {!chunk.completed && (inPast || isCurrent) && (
                    <button
                      onClick={() => {
                        onChunkComplete(chunk.id);
                        onRefresh();
                      }}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
