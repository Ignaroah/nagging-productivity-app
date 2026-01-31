# Backend Implementation Plan: Node.js/Express + Google OAuth + Multi-Device Sync

## Overview

Transform the current localStorage-based productivity app into a full-stack application with:
- **Backend**: Node.js/Express API with PostgreSQL database
- **Authentication**: Google OAuth 2.0 with JWT tokens
- **Multi-device sync**: User data accessible from any device
- **Security**: Move Anthropic API key to encrypted backend storage
- **Deployment**: Frontend on Vercel/Netlify, Backend on Railway/Render

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (managed service on Railway/Render)
- **ORM/Query Builder**: Prisma or pg-promise
- **Authentication**: Passport.js (Google OAuth) + JWT
- **Security**: bcrypt (if adding passwords), helmet, cors

### Frontend Changes
- **HTTP Client**: Axios or native fetch with interceptors
- **State Management**: React Context for auth state
- **Storage Strategy**: Hybrid (localStorage fallback + API sync)

## Implementation Phases

### Phase 1: Backend Foundation (Days 1-3)

#### Step 1.1: Project Setup
```bash
# Create backend directory
mkdir backend
cd backend
npm init -y

# Install dependencies
npm install express cors dotenv pg pg-promise passport passport-google-oauth20 jsonwebtoken bcryptjs helmet
npm install -D typescript @types/express @types/node @types/passport @types/jsonwebtoken ts-node-dev

# Initialize TypeScript
npx tsc --init
```

#### Step 1.2: Database Schema
Create tables for: `users`, `tasks`, `schedules`, `schedule_chunks`, `schedule_breaks`, `settings`

Key relationships:
- Users (1) → (N) Tasks
- Users (1) → (N) Schedules
- Schedules (1) → (N) ScheduleChunks
- Schedules (1) → (N) ScheduleBreaks
- Tasks (1) ← (N) ScheduleChunks (foreign key with ON DELETE SET NULL)

#### Step 1.3: Core Backend Files

**backend/src/server.ts**
- Express app setup
- Middleware: cors, helmet, express.json()
- Route mounting
- Error handling
- Port listening

**backend/src/config/database.ts**
- PostgreSQL connection pool
- Connection string from env var
- Query helper functions

**backend/src/middleware/auth.ts**
```typescript
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
```

### Phase 2: Authentication (Days 2-3)

#### Step 2.1: Google OAuth Setup
1. Create project in Google Cloud Console
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Set redirect URI: `https://api.yourdomain.com/auth/google/callback`

#### Step 2.2: Auth Routes
```typescript
// backend/src/routes/auth.routes.ts

// GET /auth/google - Initiate OAuth flow
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// GET /auth/google/callback - Handle OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = generateJWT(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
  }
);

// GET /auth/me - Get current user
router.get('/me', authenticateJWT, (req, res) => {
  res.json(req.user);
});
```

#### Step 2.3: JWT Service
```typescript
// backend/src/services/jwt.service.ts
export function generateJWT(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}
```

### Phase 3: Core API Endpoints (Days 4-5)

#### Step 3.1: Tasks API
```typescript
// All endpoints require authenticateJWT middleware
GET    /api/tasks              // List user's tasks
POST   /api/tasks              // Create task
GET    /api/tasks/:id          // Get single task
PUT    /api/tasks/:id          // Update task
DELETE /api/tasks/:id          // Delete task
```

#### Step 3.2: Schedules API
```typescript
GET    /api/schedules          // List user's schedules
POST   /api/schedules          // Create schedule (with nested chunks/breaks)
GET    /api/schedules/:id      // Get schedule with chunks and breaks
PUT    /api/schedules/:id      // Update schedule
DELETE /api/schedules/:id      // Delete schedule
GET    /api/schedules/active   // Get active schedule
PUT    /api/schedules/:scheduleId/chunks/:chunkId/complete  // Mark chunk complete
```

#### Step 3.3: Settings API
```typescript
GET    /api/settings           // Get user settings
PUT    /api/settings           // Update settings
PUT    /api/settings/api-key   // Store encrypted Anthropic API key
```

### Phase 4: Frontend Integration (Days 6-7)

#### Step 4.1: Create API Client
```typescript
// src/lib/api.ts
class ApiClient {
  private baseURL = import.meta.env.VITE_API_BASE_URL;
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Convenience methods
  get<T>(endpoint: string) { return this.request<T>(endpoint, { method: 'GET' }); }
  post<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  put<T>(endpoint: string, data: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  delete<T>(endpoint: string) { return this.request<T>(endpoint, { method: 'DELETE' }); }
}

export const api = new ApiClient();
```

#### Step 4.2: Auth Context
```typescript
// src/lib/auth.tsx
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL (from OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      localStorage.setItem('jwt_token', token);
      api.setToken(token);
      window.history.replaceState({}, '', '/');
    }

    // Load token from localStorage
    const savedToken = localStorage.getItem('jwt_token');
    if (savedToken) {
      api.setToken(savedToken);
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const user = await api.get<User>('/auth/me');
      setUser(user);
    } catch (error) {
      localStorage.removeItem('jwt_token');
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setUser(null);
    api.setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

#### Step 4.3: Update Storage Layer (Hybrid Mode)
```typescript
// src/lib/storage.ts - Refactor to use API when authenticated

import { api } from './api';

// Add helper to check auth
function isAuthenticated(): boolean {
  return !!localStorage.getItem('jwt_token');
}

// Example: Refactor getTasks
export async function getTasks(): Promise<Task[]> {
  if (isAuthenticated()) {
    try {
      return await api.get<Task[]>('/api/tasks');
    } catch (error) {
      console.error('Failed to fetch tasks from API, using localStorage fallback', error);
      // Fall through to localStorage
    }
  }

  // localStorage fallback
  const stored = localStorage.getItem(STORAGE_KEYS.tasks);
  return stored ? JSON.parse(stored) : [];
}

export async function addTask(task: Task): Promise<void> {
  if (isAuthenticated()) {
    try {
      await api.post('/api/tasks', task);
      return;
    } catch (error) {
      console.error('Failed to create task via API', error);
      throw error;
    }
  }

  // localStorage fallback
  const tasks = await getTasks();
  tasks.push(task);
  localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
}

// Apply same pattern to all storage functions:
// - updateTask, deleteTask
// - getSchedules, addSchedule, etc.
// - getSettings, saveSettings
```

#### Step 4.4: Add Auth UI Components
```typescript
// src/components/LoginButton.tsx
export function LoginButton() {
  const { isAuthenticated, user, login, logout } = useAuth();

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <img src={user.pictureUrl} alt={user.name} className="w-8 h-8 rounded-full" />
        <span>{user.name}</span>
        <button onClick={logout} className="text-sm text-gray-600 hover:text-gray-900">
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="bg-white border border-gray-300 rounded px-4 py-2 flex items-center gap-2 hover:bg-gray-50"
    >
      <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
      Sign in with Google
    </button>
  );
}
```

#### Step 4.5: Wrap App with AuthProvider
```typescript
// src/main.tsx or src/App.tsx
import { AuthProvider } from './lib/auth';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

Add LoginButton to header in App.tsx.

### Phase 5: Security - API Key Migration (Day 8)

#### Step 5.1: Backend API Key Storage
```typescript
// backend/src/services/encryption.service.ts
import crypto from 'crypto';

export function encryptApiKey(apiKey: string): string {
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'),
    crypto.randomBytes(16)
  );
  return cipher.update(apiKey, 'utf8', 'hex') + cipher.final('hex');
}

export function decryptApiKey(encrypted: string): string {
  // Implement decryption
}
```

#### Step 5.2: AI Proxy Endpoint
```typescript
// backend/src/routes/ai.routes.ts
router.post('/api/ai/generate', authenticateJWT, async (req, res) => {
  const user = await User.findById(req.userId);

  if (!user.anthropic_api_key) {
    return res.status(400).json({ error: 'No API key configured' });
  }

  const decryptedKey = decryptApiKey(user.anthropic_api_key);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': decryptedKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: req.body.input }]
    })
  });

  const data = await response.json();
  res.json(data);
});
```

#### Step 5.3: Update NaturalLanguageScheduler
```typescript
// src/components/NaturalLanguageScheduler.tsx

// REMOVE localStorage.getItem('anthropic_api_key')
// REMOVE localStorage.setItem('anthropic_api_key')

// REPLACE direct Anthropic API call with:
const response = await api.post('/api/ai/generate', { input });
```

### Phase 6: Data Migration (Day 7)

#### Step 6.1: Migration Endpoint
```typescript
// backend/src/routes/migration.routes.ts
router.post('/api/migrate', authenticateJWT, async (req, res) => {
  const { tasks, schedules, settings } = req.body;
  const userId = req.userId;

  try {
    // Insert tasks
    for (const task of tasks) {
      await Task.create({ ...task, userId });
    }

    // Insert schedules with nested chunks and breaks
    for (const schedule of schedules) {
      const { chunks, breaks, ...scheduleData } = schedule;
      const newSchedule = await Schedule.create({ ...scheduleData, userId });

      // Insert chunks
      for (const chunk of chunks) {
        await ScheduleChunk.create({ ...chunk, scheduleId: newSchedule.id });
      }

      // Insert breaks
      for (const break of breaks) {
        await ScheduleBreak.create({ ...break, scheduleId: newSchedule.id });
      }
    }

    // Insert settings
    await Settings.upsert({ ...settings, userId });

    res.json({
      success: true,
      migrated: {
        tasks: tasks.length,
        schedules: schedules.length,
        settings: true
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Migration failed' });
  }
});
```

#### Step 6.2: Migration UI Component
```typescript
// src/components/MigrationPrompt.tsx
export function MigrationPrompt() {
  const [show, setShow] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if user just logged in and has localStorage data
    if (isAuthenticated && hasLocalStorageData()) {
      setShow(true);
    }
  }, [isAuthenticated]);

  const handleMigrate = async () => {
    const data = {
      tasks: JSON.parse(localStorage.getItem('nagging_app_tasks') || '[]'),
      schedules: JSON.parse(localStorage.getItem('nagging_app_schedules') || '[]'),
      settings: JSON.parse(localStorage.getItem('nagging_app_settings') || '{}'),
    };

    try {
      const result = await api.post('/api/migrate', data);
      alert(`Migrated ${result.migrated.tasks} tasks and ${result.migrated.schedules} schedules`);

      // Optionally clear localStorage
      if (confirm('Clear local data now that it\'s backed up?')) {
        clearLocalStorage();
      }

      setShow(false);
    } catch (error) {
      alert('Migration failed. Your local data is safe.');
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md">
        <h2 className="text-xl font-bold mb-4">Import Local Data?</h2>
        <p className="mb-4">
          We found tasks and schedules stored locally. Would you like to import them to your account?
        </p>
        <div className="flex gap-3">
          <button onClick={handleMigrate} className="bg-blue-500 text-white px-4 py-2 rounded">
            Import Data
          </button>
          <button onClick={() => setShow(false)} className="bg-gray-300 px-4 py-2 rounded">
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Phase 7: Deployment (Day 9)

#### Step 7.1: Backend Deployment (Railway)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and initialize
railway login
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Deploy
railway up

# Set environment variables in Railway dashboard:
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - GOOGLE_REDIRECT_URI
# - JWT_SECRET
# - ENCRYPTION_KEY
# - FRONTEND_URL
```

#### Step 7.2: Frontend Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - VITE_API_BASE_URL (Railway backend URL)
# - VITE_GOOGLE_CLIENT_ID
```

#### Step 7.3: Update Google OAuth Redirect URIs
Add production URIs in Google Cloud Console:
- `https://your-backend.railway.app/auth/google/callback`

## Critical Files to Create/Modify

### Backend Files to Create (Priority Order)
1. `backend/src/server.ts` - Express app entry point
2. `backend/src/config/database.ts` - PostgreSQL connection
3. `backend/src/middleware/auth.ts` - JWT authentication middleware
4. `backend/src/routes/auth.routes.ts` - Google OAuth endpoints
5. `backend/src/routes/tasks.routes.ts` - Task CRUD endpoints
6. `backend/src/routes/schedules.routes.ts` - Schedule CRUD endpoints
7. `backend/src/routes/settings.routes.ts` - Settings endpoints
8. `backend/src/services/jwt.service.ts` - JWT generation/validation
9. `backend/src/models/User.ts` - User database queries
10. `backend/src/models/Task.ts` - Task database queries
11. `backend/migrations/*.sql` - Database schema

### Frontend Files to Modify
1. **src/lib/storage.ts** - Add API calls, keep localStorage fallback
2. **src/App.tsx** - Wrap with AuthProvider, add LoginButton to header
3. **src/components/NaturalLanguageScheduler.tsx** - Remove API key storage, use proxy

### Frontend Files to Create
1. **src/lib/api.ts** - HTTP client with auth interceptors
2. **src/lib/auth.tsx** - Auth context and provider
3. **src/components/LoginButton.tsx** - Google login UI
4. **src/components/MigrationPrompt.tsx** - Data migration UI

## Environment Variables

### Backend (.env)
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/db
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/google/callback
JWT_SECRET=generate-with-openssl-rand-hex-32
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=generate-with-openssl-rand-hex-32
FRONTEND_URL=https://yourdomain.com
```

### Frontend (.env.production)
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

## Testing Checklist

### Backend Testing
- [ ] User can authenticate with Google
- [ ] JWT tokens are generated and validated correctly
- [ ] Tasks CRUD operations work for authenticated users
- [ ] Users cannot access other users' data
- [ ] Schedules with nested chunks/breaks are created correctly
- [ ] Chunk completion updates task hours_completed
- [ ] Settings are user-specific
- [ ] API key encryption/decryption works
- [ ] AI proxy endpoint works with stored key

### Frontend Testing
- [ ] Login redirects to Google and back successfully
- [ ] JWT token is stored and used for API calls
- [ ] Tasks load from API after authentication
- [ ] Tasks fall back to localStorage when not authenticated
- [ ] Migration prompt appears after first login
- [ ] Migration successfully uploads data to backend
- [ ] All CRUD operations work through new API layer
- [ ] Natural language scheduler uses backend proxy
- [ ] Multi-device: Changes on one device appear on another

## Implementation Timeline

**Total: 9-11 days**

- Day 1: Backend setup + database schema
- Day 2: Google OAuth implementation
- Day 3: Tasks API endpoints
- Day 4: Schedules API endpoints
- Day 5: Settings API + testing
- Day 6: Frontend API client + Auth context
- Day 7: Update storage layer + Migration UI
- Day 8: API key security migration
- Day 9: Deployment + production testing
- Day 10-11: Bug fixes + polish

## Success Criteria

- [ ] Users can sign in with Google
- [ ] All existing features work (tasks, schedules, natural language AI)
- [ ] Data persists across devices
- [ ] Anthropic API key stored securely on backend
- [ ] LocalStorage data can be migrated to backend
- [ ] App works offline with localStorage fallback
- [ ] Deployed to production (Vercel + Railway)

## Risks and Mitigation

**Risk**: OAuth redirect URIs must match exactly
**Mitigation**: Test with localhost first, then update for production

**Risk**: Database schema changes during development
**Mitigation**: Use migration files, version control schema

**Risk**: Token expiration causes API failures
**Mitigation**: Add token refresh logic or use longer expiration (24h)

**Risk**: Multi-device conflicts (simultaneous edits)
**Mitigation**: Use optimistic updates, accept last-write-wins

**Risk**: Migration data loss
**Mitigation**: Keep localStorage until user confirms successful migration
