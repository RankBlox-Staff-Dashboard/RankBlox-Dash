# Google Cloud Run Deployment Guide

This guide walks you through deploying the AHS Staff Management System backend to Google Cloud Run.

## Prerequisites

1. **Google Cloud Account** - Sign up at https://cloud.google.com
2. **Google Cloud SDK (gcloud)** - Install from https://cloud.google.com/sdk/docs/install
3. **Docker** (optional, for local testing) - Install from https://www.docker.com

## Step 1: Create a Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create staff-backend-XXXXX --name="AHS Staff Backend"

# Set the project as active
gcloud config set project staff-backend-XXXXX

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com  # For Cloud SQL (PostgreSQL)
```

## Step 2: Set Up PostgreSQL Database (Cloud SQL)

### Option A: Use Cloud SQL (Recommended)

```bash
# Create a Cloud SQL PostgreSQL instance
gcloud sql instances create staff-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create a database
gcloud sql databases create staffdb --instance=staff-db

# Create a user
gcloud sql users create staffuser \
  --instance=staff-db \
  --password=YOUR_SECURE_PASSWORD

# Get the connection name (you'll need this for DATABASE_URL)
gcloud sql instances describe staff-db --format="value(connectionName)"
# Output: PROJECT_ID:REGION:INSTANCE_NAME
```

### Option B: Use External PostgreSQL

If you want to keep using Render's PostgreSQL or another provider, you can skip this step and use that connection string instead.

## Step 3: Build and Deploy with Cloud Build

### Method 1: Using Cloud Build (Recommended - CI/CD)

```bash
# Navigate to backend directory
cd backend

# Submit build to Cloud Build
gcloud builds submit --config cloudbuild.yaml
```

### Method 2: Using gcloud directly

```bash
# Build and deploy in one command
gcloud run deploy staff-backend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080
```

## Step 4: Configure Environment Variables

After deployment, set environment variables:

```bash
gcloud run services update staff-backend \
  --region us-central1 \
  --update-env-vars \
    DATABASE_URL="postgresql://user:password@/dbname?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME" \
    DISCORD_CLIENT_ID="1413264592368435382" \
    DISCORD_CLIENT_SECRET="Io4D-j14356IFptF-vB4ohghJtwNvbZp" \
    DISCORD_REDIRECT_URI="https://YOUR-SERVICE-URL.run.app/api/auth/discord/callback" \
    JWT_SECRET="your-secret-here" \
    ROBLOX_GROUP_ID="32350433" \
    BOT_API_TOKEN="your-long-random-token" \
    FRONTEND_URL="https://staffap.netlify.app" \
    NODE_ENV="production"
```

Or set them one by one:

```bash
gcloud run services update staff-backend \
  --region us-central1 \
  --update-env-vars DATABASE_URL="your-database-url"
```

## Step 5: Update Port Configuration

Cloud Run uses the `PORT` environment variable. Update `backend/src/server.ts`:

```typescript
const PORT = process.env.PORT || 8080;
```

(Already configured to use PORT env var, which Cloud Run provides automatically)

## Step 6: Get Your Service URL

```bash
# Get the service URL
gcloud run services describe staff-backend \
  --region us-central1 \
  --format="value(status.url)"
```

This will output something like: `https://staff-backend-xxxxx-uc.a.run.app`

## Step 7: Update Discord OAuth Redirect URI

1. Go to https://discord.com/developers/applications/1413264592368435382/oauth2/general
2. Add redirect URI: `https://YOUR-SERVICE-URL.run.app/api/auth/discord/callback`
3. Save changes

## Step 8: Update Frontend API URL

Update your Netlify environment variables:

```
NEXT_PUBLIC_API_URL=https://YOUR-SERVICE-URL.run.app/api
```

## Database Connection String Format

For Cloud SQL, the connection string format is:

```
postgresql://USERNAME:PASSWORD@/DATABASE_NAME?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

Or using Unix socket (recommended for Cloud Run):

```typescript
// In database.ts, Cloud Run can connect via Unix socket
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
});
```

## Continuous Deployment

### Using Cloud Build Triggers

1. Connect your GitHub repository to Cloud Build
2. Create a trigger that runs on push to `main` branch
3. Use the `cloudbuild.yaml` configuration

### Using GitHub Actions (Alternative)

Create `.github/workflows/deploy-gcloud.yml`:

```yaml
name: Deploy to Google Cloud Run

on:
  push:
    branches: [ main ]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - run: |
          gcloud builds submit --config backend/cloudbuild.yaml
```

## Pricing

Cloud Run pricing:
- **Free tier**: 2 million requests/month, 360,000 GB-seconds, 180,000 vCPU-seconds
- **Pay-as-you-go**: After free tier, very affordable for small to medium traffic
- **Scales to zero**: No cost when no traffic

Cloud SQL pricing:
- **db-f1-micro**: ~$7.67/month (1 vCPU, 0.6 GB RAM)
- **db-g1-small**: ~$25/month (1 vCPU, 1.7 GB RAM)

## Troubleshooting

### Check logs

```bash
gcloud run services logs read staff-backend --region us-central1
```

### Test locally with Cloud SQL proxy

```bash
# Install Cloud SQL proxy
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy

# Run proxy
./cloud_sql_proxy -instances=PROJECT_ID:REGION:INSTANCE_NAME=tcp:5432

# Your app can now connect to localhost:5432
```

## Useful Commands

```bash
# View all services
gcloud run services list

# Update service
gcloud run services update staff-backend --region us-central1

# Delete service
gcloud run services delete staff-backend --region us-central1

# View service details
gcloud run services describe staff-backend --region us-central1
```

