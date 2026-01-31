-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  picture_url VARCHAR(500),
  anthropic_api_key TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  estimated_hours DECIMAL(10,2) NOT NULL,
  hours_completed DECIMAL(10,2) DEFAULT 0,
  default_nag_interval INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_user_created ON tasks(user_id, created_at);

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  default_chunk_size INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schedules_user_id ON schedules(user_id);
CREATE INDEX idx_schedules_user_date ON schedules(user_id, date);
CREATE INDEX idx_schedules_user_status ON schedules(user_id, status);

-- Create schedule_breaks table
CREATE TABLE IF NOT EXISTS schedule_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schedule_breaks_schedule_id ON schedule_breaks(schedule_id);

-- Create schedule_chunks table
CREATE TABLE IF NOT EXISTS schedule_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_title VARCHAR(500) NOT NULL,
  task_priority VARCHAR(20) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  nag_interval_minutes INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('task', 'break')),
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schedule_chunks_schedule_id ON schedule_chunks(schedule_id);
CREATE INDEX idx_schedule_chunks_task_id ON schedule_chunks(task_id);
CREATE INDEX idx_schedule_chunks_schedule_start ON schedule_chunks(schedule_id, start_time);

-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT FALSE,
  default_break_duration INTEGER DEFAULT 15,
  default_chunk_size INTEGER DEFAULT 30,
  default_nag_interval INTEGER DEFAULT 15,
  time_unit VARCHAR(20) DEFAULT 'minutes' CHECK (time_unit IN ('hours', 'minutes')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_settings_user_id ON settings(user_id);

-- Create active_schedule tracking table
CREATE TABLE IF NOT EXISTS active_schedules (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
