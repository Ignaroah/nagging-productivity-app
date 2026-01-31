# Deployment Checklist ✅

Use this checklist to ensure a smooth deployment process.

## Pre-Deployment

- [ ] All features tested locally
- [ ] Frontend runs successfully (`npm run dev`)
- [ ] Backend runs successfully (`cd backend && npm run dev`)
- [ ] Database migrations work
- [ ] Environment variables documented in `.env.example`
- [ ] `.gitignore` properly configured (no secrets committed)
- [ ] README.md updated with current features
- [ ] Git repository initialized
- [ ] All changes committed

## GitHub Setup

- [ ] GitHub repository created
- [ ] Code pushed to GitHub (`git push -u origin main`)
- [ ] Repository is public or private (as desired)
- [ ] README.md displays correctly on GitHub

## Backend Deployment (Railway)

- [ ] Railway account created
- [ ] PostgreSQL database provisioned
- [ ] Backend service created
- [ ] Environment variables configured:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3001`
  - [ ] `DATABASE_URL` (from Railway PostgreSQL)
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_REDIRECT_URI`
  - [ ] `JWT_SECRET`
  - [ ] `ENCRYPTION_KEY`
  - [ ] `FRONTEND_URL`
- [ ] Root directory set to `/backend`
- [ ] Build command verified
- [ ] Deployment successful
- [ ] Backend URL noted: `https://_____.railway.app`
- [ ] API endpoint tested (e.g., `curl https://your-backend.railway.app/health`)

## Frontend Deployment (Vercel)

- [ ] Vercel account created
- [ ] Project imported from GitHub
- [ ] Framework preset set to "Vite"
- [ ] Environment variable configured:
  - [ ] `VITE_API_BASE_URL=https://your-backend.railway.app`
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Deployment successful
- [ ] Frontend URL noted: `https://_____.vercel.app`
- [ ] Website loads correctly

## Google OAuth Configuration

- [ ] Google Cloud Console project created
- [ ] OAuth 2.0 credentials created
- [ ] Authorized redirect URIs added:
  - [ ] `https://your-backend.railway.app/auth/google/callback`
  - [ ] `https://your-frontend.vercel.app`
- [ ] Authorized JavaScript origins added:
  - [ ] `https://your-frontend.vercel.app`
- [ ] OAuth consent screen configured
- [ ] Test users added (if in testing mode)

## CI/CD Setup (Optional)

- [ ] Vercel CI/CD configured:
  - [ ] `VERCEL_TOKEN` added to GitHub secrets
  - [ ] `VERCEL_ORG_ID` added to GitHub secrets
  - [ ] `VERCEL_PROJECT_ID` added to GitHub secrets
  - [ ] `VITE_API_BASE_URL` added to GitHub secrets
- [ ] Railway CI/CD configured:
  - [ ] `RAILWAY_TOKEN` added to GitHub secrets
  - [ ] `RAILWAY_SERVICE_NAME` added to GitHub secrets
- [ ] GitHub Actions workflows enabled
- [ ] Test push triggers deployment

## Production Testing

- [ ] Frontend loads without errors
- [ ] Backend API responds
- [ ] Google OAuth login works
- [ ] Can create tasks
- [ ] Can create schedules
- [ ] Visual timeline renders correctly
- [ ] Schedule auto-generates on field changes
- [ ] Can edit chunks in visual editor
- [ ] Active schedule displays correctly
- [ ] Current time indicator works
- [ ] Notifications work (browser permission granted)
- [ ] AI Schedule Assistant works (if API key configured)
- [ ] Data persists across sessions
- [ ] Mobile responsive (test on phone)

## Post-Deployment

- [ ] Update README.md with live URLs
- [ ] Share app with users/team
- [ ] Monitor logs for errors:
  - [ ] Railway logs checked
  - [ ] Vercel logs checked
- [ ] Set up monitoring/analytics (optional)
- [ ] Document any production-specific configurations
- [ ] Create backup of database (if needed)

## Maintenance

- [ ] Set up database backups
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up uptime monitoring
- [ ] Document rollback procedure
- [ ] Plan for future updates

## Troubleshooting

If something doesn't work:

1. **Check logs**:
   - Railway: Dashboard → Logs
   - Vercel: Dashboard → Logs
   - Browser: Console (F12)

2. **Verify environment variables**:
   - Are all required variables set?
   - Are URLs correct (no trailing slashes)?
   - Is CORS configured properly?

3. **Test API directly**:
   ```bash
   # Test backend health
   curl https://your-backend.railway.app/health

   # Test with frontend
   curl https://your-backend.railway.app/api/tasks \
     -H "Origin: https://your-frontend.vercel.app"
   ```

4. **Check OAuth configuration**:
   - Redirect URIs match exactly
   - Frontend URL is authorized
   - OAuth consent screen published

## 🎉 Deployment Complete!

Once all checkboxes are checked, your app is live and ready to use!

**Share your app:**
- Frontend: `https://your-app.vercel.app`
- Repository: `https://github.com/YOUR-USERNAME/nagging-productivity-app`

Remember to update your README.md with the live URLs! 🚀
