# Naggle 🎯

A modern productivity app that helps you work on long-running tasks in smaller chunks, with configurable nagging notifications to stay on track. Features "My Nagger" - an AI-powered natural language scheduler and visual timeline editor.

## ✨ Features

- **Task Management**: Create tasks with estimated hours, priorities, and progress tracking
- **Smart Scheduling**: Auto-generate schedules based on task priority and remaining time
- **Visual Timeline Editor**: Drag-and-drop interface to customize your schedule
- **My Nagger (AI Assistant)**: Use natural language to create tasks and schedules
- **Nagging Notifications**: Context-aware reminders to keep you on track
- **Real-time Progress**: Visual timeline showing current time and progress
- **Multi-device Sync**: Google OAuth login with encrypted cloud storage
- **Flexible Time Units**: Switch between hours and minutes

## 🚀 Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Browser Notification API

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL (Railway)
- Google OAuth 2.0
- JWT Authentication
- Anthropic Claude API

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (or Railway account)
- Google OAuth credentials
- Anthropic API key (optional, for AI features)

### Frontend Setup

```bash
# Install dependencies
npm install

# Create .env file (optional)
# Add VITE_API_BASE_URL if backend is not on localhost:3001

# Start development server
npm run dev
```

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# - DATABASE_URL: Your PostgreSQL connection string
# - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET: From Google Cloud Console
# - JWT_SECRET: Random string for JWT signing
# - ENCRYPTION_KEY: Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Run database migrations (if any)
npm run migrate

# Start development server
npm run dev
```

## 🔧 Environment Variables

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:3001  # Optional, defaults to localhost:3001
```

### Backend (.env)
See `backend/.env.example` for all required variables.

## 🎮 Usage

1. **Create Tasks**: Add tasks with estimated time and priority
2. **Select Tasks**: Choose which tasks to work on in this session
3. **Generate Schedule**: Automatically creates an optimized schedule
4. **Customize**: Drag chunks in the visual timeline to adjust
5. **Start Working**: Activate the schedule and receive notifications
6. **Track Progress**: Mark chunks complete as you finish them

### My Nagger (AI Assistant)

Use natural language to create tasks and schedules:
- "Create tasks for writing a blog post (2 hours) and editing photos (1 hour)"
- "Schedule my existing tasks from 9am to 5pm with lunch at 12:30"
- "Work on the report and code review tasks from 2pm to 6pm"

## 🚢 Deployment

### Frontend (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables (if needed)
4. Deploy

### Backend (Railway)

1. Push to GitHub
2. Create new project in Railway
3. Add PostgreSQL database
4. Connect GitHub repository
5. Set environment variables
6. Deploy

See `.github/workflows/` for CI/CD configuration.

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 🐛 Known Issues

- Notifications require browser permission
- Service worker not implemented (notifications don't work when tab is closed)

## 🔮 Future Enhancements

- PWA support with service worker
- Mobile app (React Native)
- Calendar integration
- Task templates
- Advanced analytics
- Team collaboration features
