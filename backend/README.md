# Nagging Productivity App - Backend API

Node.js/Express backend with PostgreSQL and Google OAuth authentication.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up PostgreSQL Database

Install PostgreSQL locally or use a hosted service (Railway, Render, etc.).

Create a database:
```bash
createdb hackathon_db
```

### 3. Run Migrations

```bash
psql -d hackathon_db -f migrations/001_create_schema.sql
```

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

**Generate secrets:**
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Set up Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

### 5. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:3001`

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/google/callback` - OAuth callback handler
- `GET /auth/me` - Get current authenticated user

### Tasks
- `GET /api/tasks` - List user's tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get single task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Schedules
- `GET /api/schedules` - List user's schedules
- `POST /api/schedules` - Create new schedule (with chunks and breaks)
- `GET /api/schedules/:id` - Get schedule with chunks
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule
- `GET /api/schedules/active` - Get active schedule
- `PUT /api/schedules/:scheduleId/chunks/:chunkId/complete` - Mark chunk complete

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### Migration
- `POST /api/migrate` - Migrate localStorage data to backend

## Development

```bash
npm run dev      # Start with hot reload
npm run build    # Compile TypeScript
npm start        # Start production server
```

## Testing

```bash
npm test
```

## Deployment

See [BACKEND_IMPLEMENTATION_PLAN.md](../BACKEND_IMPLEMENTATION_PLAN.md) for deployment instructions.
