import { db } from '../config/database';
import { Schedule, ScheduleChunk, ScheduleBreak } from '../types';

export class ScheduleModel {
  static async findById(id: string, userId: string): Promise<Schedule | null> {
    try {
      const schedule = await db.oneOrNone(
        'SELECT * FROM schedules WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!schedule) return null;

      // Load chunks and breaks
      const chunks = await db.any<ScheduleChunk>(
        'SELECT * FROM schedule_chunks WHERE schedule_id = $1 ORDER BY start_time',
        [id]
      );

      const breaks = await db.any<ScheduleBreak>(
        'SELECT * FROM schedule_breaks WHERE schedule_id = $1 ORDER BY time',
        [id]
      );

      return {
        ...schedule,
        chunks,
        breaks
      };
    } catch (error) {
      console.error('Error finding schedule:', error);
      throw error;
    }
  }

  static async findAll(userId: string, options?: {
    date?: string;
    status?: 'active' | 'completed';
  }): Promise<Schedule[]> {
    try {
      let query = 'SELECT * FROM schedules WHERE user_id = $1';
      const params: any[] = [userId];
      let paramIndex = 2;

      if (options?.date) {
        query += ` AND date = $${paramIndex++}`;
        params.push(options.date);
      }

      if (options?.status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(options.status);
      }

      query += ' ORDER BY date DESC, created_at DESC';

      const schedules = await db.any(query, params);

      // Load chunks and breaks for each schedule
      const schedulesWithData = await Promise.all(
        schedules.map(async (schedule) => {
          const chunks = await db.any<ScheduleChunk>(
            'SELECT * FROM schedule_chunks WHERE schedule_id = $1 ORDER BY start_time',
            [schedule.id]
          );

          const breaks = await db.any<ScheduleBreak>(
            'SELECT * FROM schedule_breaks WHERE schedule_id = $1 ORDER BY time',
            [schedule.id]
          );

          return {
            ...schedule,
            chunks,
            breaks
          };
        })
      );

      return schedulesWithData;
    } catch (error) {
      console.error('Error finding schedules:', error);
      throw error;
    }
  }

  static async findActive(userId: string): Promise<Schedule | null> {
    try {
      const result = await db.oneOrNone(
        `SELECT s.* FROM schedules s
         INNER JOIN active_schedules a ON s.id = a.schedule_id
         WHERE a.user_id = $1`,
        [userId]
      );

      if (!result) return null;

      // Load chunks and breaks
      const chunks = await db.any<ScheduleChunk>(
        'SELECT * FROM schedule_chunks WHERE schedule_id = $1 ORDER BY start_time',
        [result.id]
      );

      const breaks = await db.any<ScheduleBreak>(
        'SELECT * FROM schedule_breaks WHERE schedule_id = $1 ORDER BY time',
        [result.id]
      );

      return {
        ...result,
        chunks,
        breaks
      };
    } catch (error) {
      console.error('Error finding active schedule:', error);
      throw error;
    }
  }

  static async create(userId: string, scheduleData: {
    name?: string;
    date: string;
    startTime: string;
    endTime: string;
    defaultChunkSize: number;
    status: 'active' | 'completed';
    chunks: ScheduleChunk[];
    breaks: ScheduleBreak[];
  }): Promise<Schedule> {
    try {
      // Create schedule
      const schedule = await db.one(
        `INSERT INTO schedules (user_id, name, date, start_time, end_time, default_chunk_size, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [
          userId,
          scheduleData.name || null,
          scheduleData.date,
          scheduleData.startTime,
          scheduleData.endTime,
          scheduleData.defaultChunkSize,
          scheduleData.status
        ]
      );

      // Create chunks
      const chunks = await Promise.all(
        scheduleData.chunks.map(chunk =>
          db.one(
            `INSERT INTO schedule_chunks (
              schedule_id, task_id, task_title, task_priority,
              start_time, end_time, duration_minutes, nag_interval_minutes,
              type, completed, completed_at, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            RETURNING *`,
            [
              schedule.id,
              chunk.taskId || null,
              chunk.taskTitle,
              chunk.taskPriority,
              chunk.startTime,
              chunk.endTime,
              chunk.durationMinutes,
              chunk.nagIntervalMinutes,
              chunk.type,
              chunk.completed || false,
              chunk.completedAt || null
            ]
          )
        )
      );

      // Create breaks
      const breaks = await Promise.all(
        scheduleData.breaks.map(breakItem =>
          db.one(
            `INSERT INTO schedule_breaks (schedule_id, time, duration_minutes, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING *`,
            [schedule.id, breakItem.time, breakItem.durationMinutes]
          )
        )
      );

      return {
        ...schedule,
        chunks,
        breaks
      };
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  }

  static async update(id: string, userId: string, updates: Partial<Schedule>): Promise<Schedule> {
    try {
      // Verify ownership
      const existing = await db.oneOrNone(
        'SELECT id FROM schedules WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (!existing) {
        throw new Error('Schedule not found');
      }

      const schedule = await db.one(
        `UPDATE schedules
         SET name = COALESCE($1, name),
             date = COALESCE($2, date),
             start_time = COALESCE($3, start_time),
             end_time = COALESCE($4, end_time),
             default_chunk_size = COALESCE($5, default_chunk_size),
             status = COALESCE($6, status),
             updated_at = NOW()
         WHERE id = $7
         RETURNING *`,
        [updates.name, updates.date, updates.startTime, updates.endTime, updates.defaultChunkSize, updates.status, id]
      );

      // Load chunks and breaks
      const chunks = await db.any<ScheduleChunk>(
        'SELECT * FROM schedule_chunks WHERE schedule_id = $1 ORDER BY start_time',
        [id]
      );

      const breaks = await db.any<ScheduleBreak>(
        'SELECT * FROM schedule_breaks WHERE schedule_id = $1 ORDER BY time',
        [id]
      );

      return {
        ...schedule,
        chunks,
        breaks
      };
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  }

  static async delete(id: string, userId: string): Promise<void> {
    try {
      const result = await db.result(
        'DELETE FROM schedules WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Schedule not found');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  }

  static async setActive(scheduleId: string, userId: string): Promise<void> {
    try {
      // Verify schedule belongs to user
      const schedule = await db.oneOrNone(
        'SELECT id FROM schedules WHERE id = $1 AND user_id = $2',
        [scheduleId, userId]
      );

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Set as active
      await db.none(
        `INSERT INTO active_schedules (user_id, schedule_id, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET schedule_id = $2, updated_at = NOW()`,
        [userId, scheduleId]
      );
    } catch (error) {
      console.error('Error setting active schedule:', error);
      throw error;
    }
  }

  static async markChunkComplete(
    scheduleId: string,
    chunkId: string,
    userId: string
  ): Promise<{ success: boolean; updatedTask?: any }> {
    try {
      // Verify schedule belongs to user
      const schedule = await db.oneOrNone(
        'SELECT id FROM schedules WHERE id = $1 AND user_id = $2',
        [scheduleId, userId]
      );

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Get chunk
      const chunk = await db.oneOrNone<ScheduleChunk>(
        'SELECT * FROM schedule_chunks WHERE id = $1 AND schedule_id = $2',
        [chunkId, scheduleId]
      );

      if (!chunk) {
        throw new Error('Chunk not found');
      }

      if (chunk.completed) {
        return { success: true }; // Already completed
      }

      // Mark chunk complete
      await db.none(
        `UPDATE schedule_chunks
         SET completed = true, completed_at = NOW()
         WHERE id = $1`,
        [chunkId]
      );

      // Update task if this is a task chunk
      let updatedTask;
      if (chunk.type === 'task' && chunk.taskId) {
        updatedTask = await db.oneOrNone(
          `UPDATE tasks
           SET hours_completed = LEAST(hours_completed + $1, estimated_hours),
               updated_at = NOW()
           WHERE id = $2 AND user_id = $3
           RETURNING *`,
          [chunk.durationMinutes / 60, chunk.taskId, userId]
        );
      }

      return { success: true, updatedTask };
    } catch (error) {
      console.error('Error marking chunk complete:', error);
      throw error;
    }
  }
}
