# Vercel Deployment Settings - CORRECT CONFIGURATION

## Project Settings in Vercel Dashboard:

**Project Name:** `staffapp`

**Framework Preset:** `Vite` (or `Other` if Vite isn't available)

**Root Directory:** `frontend`
- ⚠️ IMPORTANT: Do NOT include `./` prefix, just use `frontend`

**Build Command:** `npm run build`

**Output Directory:** `dist`

**Install Command:** `npm install`

**Node.js Version:** 18.x or 20.x (set in Vercel project settings)

## Environment Variables:

**Key:** `VITE_API_URL`  
**Value:** `https://your-backend-url.com/api`

Replace `your-backend-url.com` with your actual backend deployment URL.

## Summary:

- Root Directory: `frontend` (without `./`)
- Build Command: `npm run build`
- Output Directory: `dist`
- Framework: Vite

