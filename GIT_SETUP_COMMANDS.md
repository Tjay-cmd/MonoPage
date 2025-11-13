# Git Setup Commands for MonoPage Repository

Run these commands in order after installing Git and restarting your terminal:

## Step 1: Navigate to your project directory (if not already there)
```bash
cd C:\Users\tjayb\OneDrive\Desktop\project-2
```

## Step 2: Initialize Git repository (if not already initialized)
```bash
git init
```

## Step 3: Add all files to Git
```bash
git add .
```

## Step 4: Make your first commit
```bash
git commit -m "Initial commit: BusinessBuilder SaaS Platform

- Complete Next.js 16 + React 19 + TypeScript setup
- GrapesJS visual editor integration
- Firebase backend (Firestore, Auth, Storage)
- PayFast payment integration
- Template system with ZIP and JSON support
- Service management with payment links
- Tier-based subscription system
- Website publishing functionality
- Comprehensive documentation"
```

## Step 5: Add GitHub repository as remote
```bash
git remote add origin https://github.com/Tjay-cmd/MonoPage.git
```

## Step 6: Set main branch and push to GitHub
```bash
git branch -M main
git push -u origin main
```

## If you get authentication errors:

You may need to authenticate with GitHub. Options:

### Option 1: Use GitHub Desktop (Easiest)
1. Download GitHub Desktop: https://desktop.github.com/
2. Sign in with your GitHub account
3. File → Add Local Repository → Select your project folder
4. Click "Publish repository"

### Option 2: Use Personal Access Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. When prompted for password, use the token instead

### Option 3: Use GitHub CLI
```bash
gh auth login
```

---

**Repository URL:** `https://github.com/Tjay-cmd/MonoPage.git`

