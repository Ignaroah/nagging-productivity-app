import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './config/env';
import { db, testConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { authenticateJWT } from './middleware/auth';
import { generateJWT, verifyJWT } from './services/jwt.service';
import { UserModel } from './models/User';
import { ScheduleModel } from './models/Schedule';
import { MigrationService } from './services/migration.service';
import { encryptApiKey, decryptApiKey } from './services/encryption.service';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: [env.FRONTEND_URL, 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackURL: env.GOOGLE_REDIRECT_URI,
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName;
      const pictureUrl = profile.photos?.[0]?.value;

      if (!email) {
        return done(new Error('No email from Google profile'));
      }

      // Find or create user
      let user = await UserModel.findByGoogleId(googleId);

      if (!user) {
        user = await UserModel.create({
          googleId,
          email,
          name,
          pictureUrl
        });
        console.log(`✓ New user created: ${email}`);
      } else {
        console.log(`✓ Existing user logged in: ${email}`);
      }

      return done(null, user);
    } catch (error) {
      console.error('OAuth error:', error);
      return done(error);
    }
  }
));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes
app.get('/auth/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${env.FRONTEND_URL}/?auth=failed` }),
  (req, res) => {
    try {
      const user = req.user as any;
      const token = generateJWT(user);

      // Redirect to frontend with token in URL hash
      res.redirect(`${env.FRONTEND_URL}/?token=${token}`);
    } catch (error) {
      console.error('Callback error:', error);
      res.redirect(`${env.FRONTEND_URL}/?auth=error`);
    }
  }
);

app.get('/auth/me', authenticateJWT, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.post('/auth/logout', authenticateJWT, (req, res) => {
  // With JWT, logout is handled client-side by removing token
  res.json({ success: true });
});

// API Routes - Tasks
app.get('/api/tasks', authenticateJWT, async (req, res) => {
  try {
    const tasks = await db.any(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', authenticateJWT, async (req, res) => {
  try {
    const { title, priority, estimatedHours, hoursCompleted, defaultNagInterval } = req.body;

    if (!title || !priority || estimatedHours === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const task = await db.one(
      `INSERT INTO tasks (user_id, title, priority, estimated_hours, hours_completed, default_nag_interval, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [req.userId, title, priority, estimatedHours, hoursCompleted || 0, defaultNagInterval || null]
    );

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, priority, estimatedHours, hoursCompleted, defaultNagInterval } = req.body;

    // Verify task belongs to user
    const existing = await db.oneOrNone(
      'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = await db.one(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           priority = COALESCE($2, priority),
           estimated_hours = COALESCE($3, estimated_hours),
           hours_completed = COALESCE($4, hours_completed),
           default_nag_interval = COALESCE($5, default_nag_interval),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title, priority, estimatedHours, hoursCompleted, defaultNagInterval, id]
    );

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.result(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// API Routes - Settings
app.get('/api/settings', authenticateJWT, async (req, res) => {
  try {
    let settings = await db.oneOrNone(
      'SELECT * FROM settings WHERE user_id = $1',
      [req.userId]
    );

    // Create default settings if none exist
    if (!settings) {
      settings = await db.one(
        `INSERT INTO settings (user_id, notifications_enabled, default_break_duration, default_chunk_size, default_nag_interval, time_unit, created_at, updated_at)
         VALUES ($1, false, 15, 30, 15, 'minutes', NOW(), NOW())
         RETURNING *`,
        [req.userId]
      );
    }

    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', authenticateJWT, async (req, res) => {
  try {
    const {
      notificationsEnabled,
      defaultBreakDuration,
      defaultChunkSize,
      defaultNagInterval,
      timeUnit
    } = req.body;

    const settings = await db.one(
      `INSERT INTO settings (user_id, notifications_enabled, default_break_duration, default_chunk_size, default_nag_interval, time_unit, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         notifications_enabled = COALESCE($2, settings.notifications_enabled),
         default_break_duration = COALESCE($3, settings.default_break_duration),
         default_chunk_size = COALESCE($4, settings.default_chunk_size),
         default_nag_interval = COALESCE($5, settings.default_nag_interval),
         time_unit = COALESCE($6, settings.time_unit),
         updated_at = NOW()
       RETURNING *`,
      [req.userId, notificationsEnabled, defaultBreakDuration, defaultChunkSize, defaultNagInterval, timeUnit]
    );

    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// API Routes - Schedules
app.get('/api/schedules', authenticateJWT, async (req, res) => {
  try {
    const { date, status } = req.query;
    const schedules = await ScheduleModel.findAll(req.userId!, {
      date: date as string,
      status: status as 'active' | 'completed'
    });
    res.json(schedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

app.get('/api/schedules/active', authenticateJWT, async (req, res) => {
  try {
    const schedule = await ScheduleModel.findActive(req.userId!);
    res.json(schedule);
  } catch (error) {
    console.error('Get active schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch active schedule' });
  }
});

app.get('/api/schedules/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await ScheduleModel.findById(id, req.userId!);

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

app.post('/api/schedules', authenticateJWT, async (req, res) => {
  try {
    const { name, date, startTime, endTime, defaultChunkSize, status, chunks, breaks } = req.body;

    if (!date || !startTime || !endTime || !defaultChunkSize || !chunks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const schedule = await ScheduleModel.create(req.userId!, {
      name,
      date,
      startTime,
      endTime,
      defaultChunkSize,
      status: status || 'active',
      chunks,
      breaks: breaks || []
    });

    // If status is active, set as active schedule
    if (schedule.status === 'active') {
      await ScheduleModel.setActive(schedule.id, req.userId!);
    }

    res.status(201).json(schedule);
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

app.put('/api/schedules/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const schedule = await ScheduleModel.update(id, req.userId!, updates);

    // If status changed to active, set as active schedule
    if (updates.status === 'active') {
      await ScheduleModel.setActive(id, req.userId!);
    }

    res.json(schedule);
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

app.delete('/api/schedules/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    await ScheduleModel.delete(id, req.userId!);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

app.put('/api/schedules/:scheduleId/chunks/:chunkId/complete', authenticateJWT, async (req, res) => {
  try {
    const { scheduleId, chunkId } = req.params;
    const result = await ScheduleModel.markChunkComplete(scheduleId, chunkId, req.userId!);
    res.json(result);
  } catch (error) {
    console.error('Mark chunk complete error:', error);
    res.status(500).json({ error: 'Failed to mark chunk complete' });
  }
});

// Migration endpoint
app.post('/api/migrate', authenticateJWT, async (req, res) => {
  try {
    const result = await MigrationService.migrateUserData(req.userId!, req.body);
    res.json(result);
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Failed to migrate data' });
  }
});

// API Routes - AI Assistant
app.put('/api/settings/api-key', authenticateJWT, async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Encrypt and store
    const encrypted = encryptApiKey(apiKey);
    await UserModel.setApiKey(req.userId!, encrypted);

    res.json({ success: true, message: 'API key saved securely' });
  } catch (error) {
    console.error('Save API key error:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

app.post('/api/ai/generate', async (req, res) => {
  try {
    const { input, tasks, apiKey: providedApiKey } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    let apiKey: string;

    // Try to get API key from authenticated user first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const payload = verifyJWT(token);

        // Get user's encrypted API key
        const encryptedKey = await UserModel.getApiKey(payload.userId);

        if (encryptedKey) {
          apiKey = decryptApiKey(encryptedKey);
        } else if (providedApiKey) {
          // Authenticated but no stored key, use provided key
          apiKey = providedApiKey;
        } else {
          return res.status(400).json({ error: 'No API key configured. Please add your Anthropic API key first.' });
        }
      } catch (err) {
        // Invalid token, fall back to provided API key
        if (providedApiKey) {
          apiKey = providedApiKey;
        } else {
          return res.status(401).json({ error: 'Invalid authentication token and no API key provided' });
        }
      }
    } else if (providedApiKey) {
      // Not authenticated, use provided API key
      apiKey = providedApiKey;
    } else {
      return res.status(400).json({ error: 'API key required. Please provide an API key or log in.' });
    }

    // Build system prompt
    const systemPrompt = `You are a task and schedule planning assistant. Parse the user's natural language request and return a JSON response with the following structure:

{
  "tasks": [
    {
      "title": "Task title",
      "estimatedTime": number (in minutes),
      "priority": "high" | "medium" | "low",
      "useExisting": false (or task ID if using existing task)
    }
  ],
  "schedule": {
    "startTime": "HH:mm" (optional),
    "endTime": "HH:mm" (optional),
    "date": "YYYY-MM-DD" (optional, defaults to today),
    "breaks": [{"time": "HH:mm", "duration": number}] (optional),
    "chunkSize": number (optional, in minutes)
  }
}

Available existing tasks: ${tasks.map((t: any) => `- "${t.title}" (id: ${t.id}, ${t.estimatedHours * 60}min remaining, ${t.priority} priority)`).join('\n')}

Guidelines:
- If the user mentions existing tasks by name, match them and use their ID in "useExisting"
- If the user says "existing tasks", "my tasks", "backlog", "current tasks" WITHOUT creating new ones, include ALL existing tasks by their IDs
- If the user mentions both new tasks AND wants existing tasks, include both (new tasks with useExisting: false, existing with their IDs)
- If creating new tasks ONLY, set "useExisting" to false
- Extract time ranges if mentioned (e.g., "9am to 5pm" → startTime: "09:00", endTime: "17:00")
- Extract breaks if mentioned (e.g., "lunch at noon" → {"time": "12:00", "duration": 30})
- If no time is specified, don't include schedule object
- Use reasonable defaults: medium priority, 30min chunks
- Return ONLY valid JSON, no explanations

Examples:
- "Schedule my existing tasks from 2pm to 5pm" → Include all existing task IDs
- "Add gardening (2hr) and schedule with my current tasks" → Create gardening + include existing task IDs
- "Create task for cooking (1hr)" → Only create new task, no existing tasks`;

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\nUser request: ${input}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API error:', errorData);
      throw new Error(errorData.error?.message || JSON.stringify(errorData) || 'Anthropic API request failed');
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('AI generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate schedule';
    res.status(500).json({ error: errorMessage });
  }
});

// Error handling
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    app.listen(env.PORT, () => {
      console.log(`✓ Server running on port ${env.PORT}`);
      console.log(`✓ Environment: ${env.NODE_ENV}`);
      console.log(`✓ Frontend URL: ${env.FRONTEND_URL}`);
      console.log(`\n🚀 Ready to accept requests!`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
