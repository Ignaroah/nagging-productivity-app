# Deployment Guide 🚀

This guide will help you deploy the Nagging Productivity App to production.

## Prerequisites

- GitHub account
- Vercel account (for frontend)
- Railway account (for backend)
- Google OAuth credentials
- Anthropic API key (optional)

## 🎯 Quick Start

### 1. Push to GitHub

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Create repository on GitHub and push
git remote add origin https://github.com/YOUR-USERNAME/nagging-productivity-app.git
git branch -M main
git push -u origin main
```

### 2. Deploy Backend to Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Click "Add variables" and add all environment variables from `backend/.env.example`:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `DATABASE_URL` (provided by Railway PostgreSQL)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI=https://your-backend.railway.app/auth/google/callback`
   - `JWT_SECRET` (generate random string)
   - `ENCRYPTION_KEY` (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `FRONTEND_URL=https://your-frontend.vercel.app`

5. Set the root directory to `/backend`
6. Railway will auto-deploy your backend
7. Note your backend URL (e.g., `https://your-app.railway.app`)

### 3. Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Click "New Project" → Import your GitHub repository
3. Configure:
   - Framework Preset: Vite
   - Root Directory: `./` (leave as root)
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variable:
   - `VITE_API_BASE_URL=https://your-backend.railway.app`
5. Deploy
6. Note your frontend URL (e.g., `https://your-app.vercel.app`)

### 4. Update Google OAuth Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Add authorized redirect URIs:
   - `https://your-backend.railway.app/auth/google/callback`
   - `https://your-frontend.vercel.app`
5. Add authorized JavaScript origins:
   - `https://your-frontend.vercel.app`

### 5. Set Up CI/CD (Optional)

To enable automatic deployments on push:

#### Vercel CI/CD
1. Go to Vercel project settings
2. Copy your Vercel token from [Account Settings](https://vercel.com/account/tokens)
3. Add GitHub secrets:
   - `VERCEL_TOKEN`: Your Vercel token
   - `VERCEL_ORG_ID`: From Vercel project settings
   - `VERCEL_PROJECT_ID`: From Vercel project settings
   - `VITE_API_BASE_URL`: Your backend URL

#### Railway CI/CD
1. Go to Railway project settings
2. Generate deployment token
3. Add GitHub secrets:
   - `RAILWAY_TOKEN`: Your Railway token
   - `RAILWAY_SERVICE_NAME`: Your service name

Now every push to `main` will trigger automatic deployments!

## 🔒 Environment Variables

### Frontend
```
VITE_API_BASE_URL=https://your-backend.railway.app
```

### Backend
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-backend.railway.app/auth/google/callback
JWT_SECRET=random-secret-here
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=random-32-byte-hex
FRONTEND_URL=https://your-frontend.vercel.app
```

## 🧪 Testing Production

1. Visit your frontend URL
2. Test login with Google OAuth
3. Create a task
4. Generate a schedule
5. Try the AI assistant (requires Anthropic API key)
6. Test notifications (grant permission)

## 🐛 Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL` in backend matches your Vercel URL exactly
- Check Railway logs for CORS configuration

### OAuth Not Working
- Verify redirect URIs in Google Cloud Console
- Check that URIs match your deployed URLs exactly (no trailing slashes)

### Database Connection Failed
- Verify `DATABASE_URL` is set in Railway
- Check Railway PostgreSQL service is running

### Build Failures
- Check GitHub Actions logs
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

## 📊 Monitoring

### Railway
- View logs: Railway dashboard → Your service → Logs
- Monitor metrics: Railway dashboard → Metrics

### Vercel
- View logs: Vercel dashboard → Your project → Logs
- Monitor analytics: Vercel dashboard → Analytics

## 🔄 Updates

To deploy updates:

```bash
git add .
git commit -m "Your changes"
git push
```

CI/CD will automatically deploy to production!

## 🎉 Success!

Your app should now be live at:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-backend.railway.app`

Share your app and enjoy productive nagging! 🎯
