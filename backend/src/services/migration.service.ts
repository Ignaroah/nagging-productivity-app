import { db } from '../config/database';
import { Task, Schedule, AppSettings, MigrationRequest, MigrationResponse } from '../types';

export class MigrationService {
  static async migrateUserData(
    userId: string,
    data: MigrationRequest
  ): Promise<MigrationResponse> {
    try {
      // Start transaction
      await db.tx(async t => {
        // Migrate tasks
        for (const task of data.tasks) {
          await t.none(
            `INSERT INTO tasks (id, user_id, title, priority, estimated_hours, hours_completed, default_nag_interval, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [
              task.id,
              userId,
              task.title,
              task.priority,
              task.estimatedHours,
              task.hoursCompleted,
              task.defaultNagInterval || null,
              task.createdAt
            ]
          );
        }

        // Migrate schedules (with chunks and breaks)
        for (const schedule of data.schedules) {
          // Insert schedule
          await t.none(
            `INSERT INTO schedules (id, user_id, name, date, start_time, end_time, default_chunk_size, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [
              schedule.id,
              userId,
              schedule.name || null,
              schedule.date,
              schedule.startTime,
              schedule.endTime,
              schedule.defaultChunkSize,
              schedule.status,
              schedule.createdAt
            ]
          );

          // Insert chunks
          for (const chunk of schedule.chunks) {
            await t.none(
              `INSERT INTO schedule_chunks (
                id, schedule_id, task_id, task_title, task_priority,
                start_time, end_time, duration_minutes, nag_interval_minutes,
                type, completed, completed_at, created_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
              ON CONFLICT (id) DO NOTHING`,
              [
                chunk.id,
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
            );
          }

          // Insert breaks
          for (const breakItem of schedule.breaks) {
            await t.none(
              `INSERT INTO schedule_breaks (id, schedule_id, time, duration_minutes, created_at)
               VALUES ($1, $2, $3, $4, NOW())
               ON CONFLICT (id) DO NOTHING`,
              [breakItem.id, schedule.id, breakItem.time, breakItem.durationMinutes]
            );
          }
        }

        // Migrate settings
        if (data.settings) {
          await t.none(
            `INSERT INTO settings (
              user_id, notifications_enabled, default_break_duration,
              default_chunk_size, default_nag_interval, time_unit,
              created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET
              notifications_enabled = EXCLUDED.notifications_enabled,
              default_break_duration = EXCLUDED.default_break_duration,
              default_chunk_size = EXCLUDED.default_chunk_size,
              default_nag_interval = EXCLUDED.default_nag_interval,
              time_unit = EXCLUDED.time_unit,
              updated_at = NOW()`,
            [
              userId,
              data.settings.notificationsEnabled,
              data.settings.defaultBreakDuration,
              data.settings.defaultChunkSize,
              data.settings.defaultNagInterval,
              data.settings.timeUnit
            ]
          );
        }

        // Set active schedule if provided
        if (data.activeScheduleId) {
          await t.none(
            `INSERT INTO active_schedules (user_id, schedule_id, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id)
             DO UPDATE SET schedule_id = $2, updated_at = NOW()`,
            [userId, data.activeScheduleId]
          );
        }
      });

      return {
        success: true,
        migrated: {
          tasks: data.tasks.length,
          schedules: data.schedules.length,
          settings: !!data.settings
        }
      };
    } catch (error) {
      console.error('Migration error:', error);
      throw new Error('Failed to migrate data');
    }
  }
}
