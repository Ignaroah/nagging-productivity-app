import { useState } from 'react';
import { Schedule, ScheduleChunk, Task } from '../types';
import { formatTime, timeToMinutes, minutesToTime } from '../lib/utils';
import ChunkEditModal from './ChunkEditModal';

interface VisualScheduleEditorProps {
  schedule: Schedule;
  tasks: Task[];
  onScheduleUpdate: (schedule: Schedule) => void;
}

export default function VisualScheduleEditor({ schedule, tasks, onScheduleUpdate }: VisualScheduleEditorProps) {
  const [draggedChunkId, setDraggedChunkId] = useState<string | null>(null);
  const [resizingChunk, setResizingChunk] = useState<{ id: string; edge: 'start' | 'end' } | null>(null);
  const [editingChunk, setEditingChunk] = useState<ScheduleChunk | null>(null);

  // Calculate timeline parameters
  const startMinutes = timeToMinutes(schedule.startTime);
  const endMinutes = timeToMinutes(schedule.endTime);
  const totalMinutes = endMinutes - startMinutes;

  // Adaptive zoom: increase pixels per minute for short schedules
  const minTimelineHeight = 400; // Minimum height for usability
  let pixelsPerMinute: number;

  if (totalMinutes < 30) {
    // For very short schedules (< 30 min), ensure minimum height
    pixelsPerMinute = Math.max(minTimelineHeight / totalMinutes, 10);
  } else if (totalMinutes < 120) {
    // For short schedules (30 min - 2 hours), use higher granularity
    pixelsPerMinute = 5;
  } else if (totalMinutes < 240) {
    // For medium schedules (2-4 hours), use moderate granularity
    pixelsPerMinute = 3;
  } else {
    // For long schedules (4+ hours), use standard granularity
    pixelsPerMinute = 2;
  }

  const timelineHeight = Math.max(totalMinutes * pixelsPerMinute, minTimelineHeight);

  // Generate hour markers
  const hourMarkers: number[] = [];
  const startHour = Math.floor(startMinutes / 60);
  const endHour = Math.ceil(endMinutes / 60);
  for (let h = startHour; h <= endHour; h++) {
    hourMarkers.push(h * 60);
  }

  const getChunkStyle = (chunk: ScheduleChunk) => {
    const chunkStartMinutes = timeToMinutes(chunk.startTime);
    const chunkEndMinutes = timeToMinutes(chunk.endTime);
    const top = (chunkStartMinutes - startMinutes) * pixelsPerMinute;
    const height = (chunkEndMinutes - chunkStartMinutes) * pixelsPerMinute;

    return {
      top: `${top}px`,
      height: `${height}px`
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-400 hover:bg-red-500 border-red-600';
      case 'medium':
        return 'bg-yellow-400 hover:bg-yellow-500 border-yellow-600';
      case 'low':
        return 'bg-green-400 hover:bg-green-500 border-green-600';
      default:
        return 'bg-gray-400 hover:bg-gray-500 border-gray-600';
    }
  };

  const handleDragStart = (chunkId: string) => {
    setDraggedChunkId(chunkId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetChunkId?: string) => {
    e.preventDefault();
    if (!draggedChunkId) return;

    const chunks = [...schedule.chunks];
    const draggedIndex = chunks.findIndex(c => c.id === draggedChunkId);
    if (draggedIndex === -1) return;

    const [draggedChunk] = chunks.splice(draggedIndex, 1);

    if (targetChunkId && targetChunkId !== draggedChunkId) {
      // Drop on another chunk - reorder
      const targetIndex = chunks.findIndex(c => c.id === targetChunkId);
      if (targetIndex === -1) return;
      chunks.splice(targetIndex, 0, draggedChunk);
    } else {
      // Drop on timeline - place at specific time
      const timeline = document.getElementById('timeline');
      if (!timeline) return;

      const rect = timeline.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const dropMinutes = Math.round(y / pixelsPerMinute + startMinutes);

      // Find where to insert based on time
      let insertIndex = chunks.length;
      for (let i = 0; i < chunks.length; i++) {
        if (dropMinutes < timeToMinutes(chunks[i].startTime)) {
          insertIndex = i;
          break;
        }
      }
      chunks.splice(insertIndex, 0, draggedChunk);
    }

    // Recalculate times based on new order, handling overlaps
    let currentMinutes = startMinutes;
    const updatedChunks = chunks.map((chunk, index) => {
      const duration = chunk.durationMinutes;

      // Check if we're going to exceed the end time
      const potentialEnd = currentMinutes + duration;
      let actualDuration = duration;

      // If this would go past the schedule end, truncate it
      if (potentialEnd > endMinutes) {
        actualDuration = Math.max(5, endMinutes - currentMinutes);
      }

      // Check if next chunk would overlap - if so, adjust current chunk
      if (index < chunks.length - 1) {
        const nextChunkMinDuration = 5; // Minimum 5 minutes for next chunk
        const maxAllowedEnd = endMinutes - nextChunkMinDuration;
        if (currentMinutes + actualDuration > maxAllowedEnd) {
          actualDuration = Math.max(5, maxAllowedEnd - currentMinutes);
        }
      }

      const newChunk = {
        ...chunk,
        startTime: minutesToTime(currentMinutes),
        endTime: minutesToTime(currentMinutes + actualDuration),
        durationMinutes: actualDuration
      };
      currentMinutes += actualDuration;
      return newChunk;
    });

    const updatedSchedule = { ...schedule, chunks: updatedChunks };
    onScheduleUpdate(updatedSchedule);
    setDraggedChunkId(null);
  };

  const handleResizeStart = (chunkId: string, edge: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingChunk({ id: chunkId, edge });
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!resizingChunk) return;

    const timeline = document.getElementById('timeline');
    if (!timeline) return;

    const rect = timeline.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.round(y / pixelsPerMinute + startMinutes);

    const chunks = [...schedule.chunks];
    const chunkIndex = chunks.findIndex(c => c.id === resizingChunk.id);
    if (chunkIndex === -1) return;

    const chunk = chunks[chunkIndex];
    let newStartMinutes = timeToMinutes(chunk.startTime);
    let newEndMinutes = timeToMinutes(chunk.endTime);

    if (resizingChunk.edge === 'start') {
      // Resizing from top - check for overlap with previous chunk
      const prevChunk = chunkIndex > 0 ? chunks[chunkIndex - 1] : null;
      const minStart = prevChunk ? timeToMinutes(prevChunk.endTime) : startMinutes;
      newStartMinutes = Math.max(minStart, Math.min(minutes, newEndMinutes - 5));
    } else {
      // Resizing from bottom - check for overlap with next chunk
      const nextChunk = chunkIndex < chunks.length - 1 ? chunks[chunkIndex + 1] : null;
      const maxEnd = nextChunk ? timeToMinutes(nextChunk.startTime) : endMinutes;
      newEndMinutes = Math.min(maxEnd, Math.max(minutes, newStartMinutes + 5));

      // If we're expanding and overlapping next chunk, shorten the next chunk
      if (nextChunk && newEndMinutes > timeToMinutes(nextChunk.startTime)) {
        const remainingTime = timeToMinutes(nextChunk.endTime) - newEndMinutes;
        if (remainingTime >= 5) {
          chunks[chunkIndex + 1] = {
            ...nextChunk,
            startTime: minutesToTime(newEndMinutes),
            durationMinutes: remainingTime
          };
        } else {
          // Not enough room, cap the resize
          newEndMinutes = timeToMinutes(nextChunk.startTime);
        }
      }
    }

    chunks[chunkIndex] = {
      ...chunk,
      startTime: minutesToTime(newStartMinutes),
      endTime: minutesToTime(newEndMinutes),
      durationMinutes: newEndMinutes - newStartMinutes
    };

    onScheduleUpdate({ ...schedule, chunks });
  };

  const handleResizeEnd = () => {
    setResizingChunk(null);
  };

  const handleChunkClick = (chunk: ScheduleChunk, e: React.MouseEvent) => {
    // Don't open modal if we're resizing or if clicking on resize handles
    if (resizingChunk) return;
    const target = e.target as HTMLElement;
    if (target.classList.contains('cursor-ns-resize')) return;

    setEditingChunk(chunk);
  };

  const handleChunkSave = (updatedChunk: ScheduleChunk) => {
    const chunks = schedule.chunks.map(c =>
      c.id === updatedChunk.id ? updatedChunk : c
    );

    // Re-sort chunks by start time
    chunks.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const updatedSchedule = { ...schedule, chunks };
    onScheduleUpdate(updatedSchedule);
    setEditingChunk(null);
  };

  const handleChunkDelete = () => {
    if (!editingChunk) return;

    const chunks = schedule.chunks.filter(c => c.id !== editingChunk.id);

    // Recalculate times to fill the gap
    let currentMinutes = startMinutes;
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

    const updatedSchedule = { ...schedule, chunks: updatedChunks };
    onScheduleUpdate(updatedSchedule);
    setEditingChunk(null);
  };

  const handleChunkCancel = () => {
    setEditingChunk(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold">Visual Schedule Editor</h3>
          <p className="text-sm text-gray-600">Drag chunks to timeline or other chunks, drag edges to resize. Changes apply instantly.</p>
        </div>
      </div>

      <div className="flex gap-4 overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 overflow-hidden">
          <div className="flex max-h-[600px] overflow-y-auto">
            {/* Time labels */}
            <div className="w-16 flex-shrink-0 relative">
              {hourMarkers.map(minutes => {
                const offsetFromStart = (minutes - startMinutes) * pixelsPerMinute;
                return (
                  <div
                    key={minutes}
                    className="relative text-xs text-gray-500"
                    style={{ top: `${offsetFromStart}px`, position: 'absolute' }}
                  >
                    {formatTime(minutesToTime(minutes))}
                  </div>
                );
              })}
            </div>

            {/* Timeline grid and chunks */}
            <div className="flex-1 relative border-l border-gray-200">
              <div
                id="timeline"
                className="relative"
                style={{ height: `${timelineHeight}px` }}
                onMouseMove={handleResizeMove}
                onMouseUp={handleResizeEnd}
                onMouseLeave={handleResizeEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e)}
              >
                {/* Hour grid lines */}
                {hourMarkers.map(minutes => {
                  const offsetFromStart = (minutes - startMinutes) * pixelsPerMinute;
                  return (
                    <div
                      key={minutes}
                      className="absolute w-full border-t border-gray-200"
                      style={{ top: `${offsetFromStart}px` }}
                    />
                  );
                })}

                {/* Chunks */}
                {schedule.chunks.map((chunk, index) => {
                  const style = getChunkStyle(chunk);
                  const isBreak = chunk.type === 'break';
                  const heightPx = chunk.durationMinutes * pixelsPerMinute;

                  // Determine what to show based on height
                  const showFullContent = heightPx >= 60; // Show all text if >=60px (~30min)
                  const showMinimalContent = heightPx >= 30; // Show title only if >=30px (~15min)
                  const showOnlyTime = heightPx >= 20; // Show only time if >=20px (~10min)

                  return (
                    <div
                      key={chunk.id}
                      draggable={!resizingChunk}
                      onDragStart={() => handleDragStart(chunk.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, chunk.id)}
                      onClick={(e) => handleChunkClick(chunk, e)}
                      className={`absolute left-0 right-0 mx-2 border-2 rounded cursor-pointer transition-colors ${
                        isBreak
                          ? 'bg-gray-300 border-gray-500 hover:bg-gray-400'
                          : getPriorityColor(chunk.taskPriority)
                      } ${draggedChunkId === chunk.id ? 'opacity-50' : ''}`}
                      style={style}
                      title={`${chunk.taskTitle} (${formatTime(chunk.startTime)} - ${formatTime(chunk.endTime)})`}
                    >
                      {/* Resize handle - top */}
                      {!isBreak && (
                        <div
                          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black hover:bg-opacity-20"
                          onMouseDown={(e) => handleResizeStart(chunk.id, 'start', e)}
                        />
                      )}

                      {/* Content */}
                      <div className="p-2 text-sm overflow-hidden h-full flex items-center justify-center">
                        {showFullContent ? (
                          <div className="w-full overflow-hidden">
                            <div className="font-semibold text-gray-900 truncate">
                              {chunk.taskTitle}
                            </div>
                            <div className="text-xs text-gray-700 mt-1 truncate">
                              {formatTime(chunk.startTime)} - {formatTime(chunk.endTime)}
                            </div>
                            <div className="text-xs text-gray-700 truncate">
                              {chunk.durationMinutes} min
                              {!isBreak && chunk.nagIntervalMinutes > 0 && (
                                <span className="ml-2">🔔 {chunk.nagIntervalMinutes}m</span>
                              )}
                            </div>
                          </div>
                        ) : showMinimalContent ? (
                          <div className="w-full overflow-hidden">
                            <div className="font-semibold text-gray-900 truncate text-xs">
                              {chunk.taskTitle}
                            </div>
                          </div>
                        ) : showOnlyTime ? (
                          <div className="text-xs text-gray-700 truncate">
                            {formatTime(chunk.startTime)}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-700">•</div>
                        )}
                      </div>

                      {/* Resize handle - bottom */}
                      {!isBreak && (
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black hover:bg-opacity-20"
                          onMouseDown={(e) => handleResizeStart(chunk.id, 'end', e)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="w-48 flex-shrink-0">
          <div className="bg-gray-50 border border-gray-200 rounded p-3">
            <h4 className="font-semibold text-sm mb-2">Priority Colors</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-400 border border-red-600 rounded"></div>
                <span>High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-400 border border-yellow-600 rounded"></div>
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-400 border border-green-600 rounded"></div>
                <span>Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 border border-gray-500 rounded"></div>
                <span>Break</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-300">
              <h4 className="font-semibold text-sm mb-2">Tips</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Click chunk to edit details</li>
                <li>• Drag chunks to timeline to place at time</li>
                <li>• Drag onto other chunks to reorder</li>
                <li>• Drag top/bottom edges to resize</li>
                <li>• Changes apply instantly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingChunk && (
        <ChunkEditModal
          chunk={editingChunk}
          tasks={tasks}
          scheduleStartTime={schedule.startTime}
          scheduleEndTime={schedule.endTime}
          onSave={handleChunkSave}
          onDelete={handleChunkDelete}
          onCancel={handleChunkCancel}
        />
      )}
    </div>
  );
}
