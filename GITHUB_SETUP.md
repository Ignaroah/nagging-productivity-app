# GitHub Setup Guide 📦

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository:
   - Name: `nagging-productivity-app` (or your preferred name)
   - Description: "AI-powered productivity app with smart scheduling and nagging notifications"
   - Visibility: Public or Private (your choice)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. Click "Create repository"

## Step 2: Push to GitHub

Copy the commands from GitHub's "push an existing repository" section, or use these:

```bash
# Add GitHub as remote origin (replace YOUR-USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR-USERNAME/nagging-productivity-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

If you need to use SSH instead:
```bash
git remote add origin git@github.com:YOUR-USERNAME/nagging-productivity-app.git
git branch -M main
git push -u origin main
```

## Step 3: Verify

1. Refresh your GitHub repository page
2. You should see all your files committed
3. Check that the following files are present:
   - README.md
   - DEPLOYMENT.md
   - .github/workflows/ (CI/CD configs)
   - vercel.json
   - .gitignore

## Step 4: Set Up Secrets for CI/CD (Optional)

If you want automatic deployments:

### For GitHub Actions:
1. Go to your repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add these secrets:

**For Vercel Deployment:**
- `VERCEL_TOKEN`: Get from [Vercel Account Settings](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID`: Get from Vercel project settings
- `VERCEL_PROJECT_ID`: Get from Vercel project settings
- `VITE_API_BASE_URL`: Your backend URL (e.g., `https://your-backend.railway.app`)

**For Railway Deployment:**
- `RAILWAY_TOKEN`: Get from Railway project settings
- `RAILWAY_SERVICE_NAME`: Your service name in Railway

## Step 5: Deploy

Follow the instructions in [DEPLOYMENT.md](./DEPLOYMENT.md) to deploy your app to production.

## 🎉 Success!

Your code is now on GitHub with:
- ✅ Version control
- ✅ CI/CD pipelines ready
- ✅ Professional README
- ✅ Deployment documentation

Next: Deploy to production! See [DEPLOYMENT.md](./DEPLOYMENT.md)
