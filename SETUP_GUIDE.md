# Setup Guide: Nagging Productivity App with Backend

This guide will help you set up the full-stack app with Google OAuth authentication and PostgreSQL backend.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL installed (or use a hosted service)
- Google Cloud Console account

## Step 1: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **Google+ API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "Nagging Productivity App"
   - Authorized redirect URIs:
     - `http://localhost:3001/auth/google/callback` (development)
     - Add production URL later when deployed
   - Click "Create"
5. Copy the **Client ID** and **Client Secret**

## Step 2: Database Setup

### Option A: Local PostgreSQL

```bash
# Create database
createdb hackathon_db

# Run migrations
psql -d hackathon_db -f backend/migrations/001_create_schema.sql
```

### Option B: Hosted PostgreSQL (Railway/Render)

1. Sign up at [Railway.app](https://railway.app) or [Render.com](https://render.com)
2. Create a new PostgreSQL database
3. Copy the connection string (DATABASE_URL)
4. Connect using psql and run migrations:

```bash
psql "your-database-url-here" -f backend/migrations/001_create_schema.sql
```

## Step 3: Backend Configuration

```bash
cd backend

# Create .env file
cp .env.example .env

# Edit .env file with your values
```

Required environment variables:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/hackathon_db
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
JWT_SECRET=generate-random-32-byte-string
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=generate-random-32-byte-string
FRONTEND_URL=http://localhost:5173
```

### Generate Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste into your `.env` file.

## Step 4: Frontend Configuration

```bash
# In project root
cp .env.example .env

# Edit .env file
```

Required environment variables:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Use the same Google Client ID from step 1.

## Step 5: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ..
npm install
```

## Step 6: Start Development Servers

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

You should see:
```
✓ Database connection established
✓ Server running on port 3001
✓ Environment: development
✓ Frontend URL: http://localhost:5173

🚀 Ready to accept requests!
```

### Terminal 2: Frontend

```bash
# From project root
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

## Step 7: Test the Application

1. Open http://localhost:5173 in your browser
2. Click "Sign in with Google" in the top-right corner
3. Authorize the app
4. You should be redirected back with your profile shown
5. If you have existing localStorage data, you'll see a migration prompt

## Troubleshooting

### "Failed to connect to database"

- Check DATABASE_URL is correct
- Verify PostgreSQL is running
- Try connecting with psql manually: `psql "your-database-url"`

### "OAuth error" or redirect fails

- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Check redirect URI matches exactly: `http://localhost:3001/auth/google/callback`
- Make sure Google+ API is enabled in Cloud Console

### "CORS error" in browser console

- Verify FRONTEND_URL in backend .env matches your frontend URL
- Check backend is running on port 3001
- Try clearing browser cache

### "Invalid or expired token"

- JWT_SECRET in backend .env must remain consistent
- Try logging out and logging in again
- Clear localStorage: `localStorage.clear()` in browser console

## Testing the Full Flow

1. **Without login** (localStorage mode):
   - Add tasks
   - Create schedule
   - Verify data persists on page refresh

2. **After login** (API mode):
   - Click "Import Data" if you see migration prompt
   - Create new tasks
   - Open app in another browser/device
   - Verify data syncs across devices

3. **Natural Language Scheduler**:
   - Tasks tab > Natural Language Scheduler
   - Enter Anthropic API key (stored securely on backend)
   - Try: "Work on project for 2 hours and code review from 2pm to 4pm"

## Production Deployment

See [BACKEND_IMPLEMENTATION_PLAN.md](BACKEND_IMPLEMENTATION_PLAN.md) for detailed deployment instructions to:
- Frontend: Vercel/Netlify
- Backend: Railway/Render
- Database: Managed PostgreSQL

## Quick Reference

### Useful Commands

```bash
# Backend dev server
cd backend && npm run dev

# Frontend dev server
npm run dev

# Build backend for production
cd backend && npm run build

# Build frontend for production
npm run build

# View backend logs
cd backend && npm run dev

# Database migrations
psql -d hackathon_db -f backend/migrations/001_create_schema.sql
```

### API Endpoints

- Auth: `GET /auth/google`, `GET /auth/me`
- Tasks: `GET/POST/PUT/DELETE /api/tasks`
- Schedules: `GET/POST/PUT/DELETE /api/schedules`
- Settings: `GET/PUT /api/settings`
- Migration: `POST /api/migrate`

### Default Ports

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- PostgreSQL: localhost:5432

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check backend terminal for error logs
3. Verify all environment variables are set correctly
4. Try restarting both servers
5. Clear browser localStorage and cookies

## Next Steps

- Set up automatic database backups
- Configure production environment variables
- Add more OAuth providers (GitHub, etc.)
- Set up CI/CD pipeline
- Enable HTTPS in production
