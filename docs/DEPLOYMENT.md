CodeGuardian Pro - Deployment Guide

📦 Deployment Overview

CodeGuardian Pro को deploy करने के multiple options हैं। आप अपनी convenience के according choose कर सकते हैं।

🚀 Quick Start (5 Minutes)

Option 1: Vercel (Recommended - सबसे आसान)

```bash
# Step 1: GitHub पर code push करें
git add .
git commit -m "Initial commit"
git push origin main

# Step 2: Vercel में जाएं
# https://vercel.com/new

# Step 3: GitHub repo connect करें
# Step 4: Environment variables set करें
# Step 5: DEPLOY! 🎉
```

Option 2: Netlify

```bash
# Step 1: Build command set करें
npm run build

# Step 2: Publish directory
dist/  # or build/

# Step 3: Environment variables add करें
# Step 4: Deploy!
```

🔧 Manual Deployment Steps

Prerequisites (जरूरी चीजें)

· Node.js 18+
· PostgreSQL database
· GitHub account
· Google Cloud account (Gemini AI के लिए)

Step-by-Step Setup

1. Environment Variables Setup

.env.production file create करें:

```env
# Database
DATABASE_URL="postgresql://username:password@host:5432/codeguardian_pro"

# GitHub OAuth
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_secret"

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_secret"

# Gemini AI
GEMINI_API_KEY="your_gemini_api_key"

# AdSense
ADSENSE_CLIENT_ID="your_adsense_client_id"
```

2. Database Setup

```bash
# PostgreSQL install करें (अगर नहीं है)
# Ubuntu/Debian:
sudo apt-get install postgresql postgresql-contrib

# Database create करें
createdb codeguardian_pro

# Tables create करें
npm run db:push
```

3. Build Application

```bash
# Dependencies install
npm install

# Build frontend
npm run build

# Build backend
npm run build:server
```

4. Start Application

```bash
# Production mode में start
npm start

# OR PM2 use करें (recommended)
npm install -g pm2
pm2 start ecosystem.config.js
```

🐳 Docker Deployment

Dockerfile के साथ Deploy

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Docker Commands:

```bash
# Image build करें
docker build -t codeguardian-pro .

# Container run करें
docker run -d -p 3000:3000 \
  --env-file .env.production \
  --name codeguardian-app \
  codeguardian-pro
```

Docker Compose (Recommended)

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - database
    env_file:
      - .env.production

  database:
    image: postgres:13
    environment:
      POSTGRES_DB: codeguardian_pro
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run करें:

```bash
docker-compose up -d
```

🌐 Cloud Platform Deployment

A. Vercel Deployment

Steps:

1. Vercel account बनाएं
2. GitHub repo connect करें
3. Environment variables set करें
4. Deploy!

vercel.json:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

B. AWS Deployment

EC2 Instance पर Deploy:

```bash
# SSH to EC2
ssh ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Clone repo
git clone https://github.com/yourusername/codeguardian-pro.git
cd codeguardian-pro

# Setup environment
cp .env.example .env.production
# Edit .env.production with your values

# Install and start
npm install
npm run build
npm start
```

AWS with PM2:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "codeguardian" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

C. Heroku Deployment

```bash
# Heroku CLI install
npm install -g heroku

# Login
heroku login

# Create app
heroku create your-codeguardian-app

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set GITHUB_CLIENT_ID=your_id
# ... other variables

# Deploy
git push heroku main
```

🔐 Environment Variables Configuration

Required Variables:

```env
# MUST HAVE (जरूरी):
DATABASE_URL="postgresql://..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GEMINI_API_KEY="..."

# OPTIONAL (optional):
ADSENSE_CLIENT_ID="..."
STRIPE_SECRET_KEY="..."
SENTRY_DSN="..."
```

How to Get API Keys:

1. GitHub OAuth:
   · GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   · Authorization callback URL: https://yourdomain.com/api/auth/github/callback
2. Google OAuth:
   · Google Cloud Console → APIs & Services → Credentials
   · Create OAuth 2.0 Client ID
   · Add authorized redirect URIs
3. Gemini AI:
   · Google AI Studio → Get API Key

📊 Database Migration

Production Database Setup:

```bash
# Schema push
npx prisma db push

# OR Generate migration
npx prisma migrate dev --name init

# Apply migration
npx prisma migrate deploy

# Seed data (optional)
npx prisma db seed
```

🔍 Health Check & Monitoring

Application Health:

```bash
# Check if app is running
curl http://localhost:3000/api/health

# Check database connection
curl http://localhost:3000/api/health/db

# Check all services
curl http://localhost:3000/api/health/full
```

PM2 Monitoring:

```bash
# Check status
pm2 status

# View logs
pm2 logs codeguardian

# Monitor resources
pm2 monit
```

🛡️ Security Checklist

Before going live:

· Environment variables set properly
· Database passwords strong
· SSL certificate installed
· CORS configured
· Rate limiting enabled
· API keys secured
· Error logging setup
· Backup strategy in place

🚨 Troubleshooting

Common Issues:

1. Build Fails:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```
2. Database Connection Error:
   · Check DATABASE_URL format
   · Verify database is running
   · Check firewall settings
3. OAuth Not Working:
   · Verify callback URLs
   · Check client ID/secret
   · Ensure redirect URIs match
4. Static Files Not Loading:
   · Check build output directory
   · Verify file permissions
   · Check server configuration

Logs Check:

```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Database logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log
```

📈 Performance Optimization

Production Build:

```bash
# Optimized build
npm run build:prod

# Bundle analyzer
npm run build:analyze

# Compression enabled
npm run build:compressed
```

Caching Strategy:

```nginx
# nginx configuration
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location / {
    try_files $uri $uri/ /index.html;
}
```

🔄 CI/CD Pipeline

GitHub Actions Example:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      - run: npm test
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

🎯 Deployment Verification

After deployment, verify:

1. Website Loads: https://yourdomain.com
2. API Working: https://yourdomain.com/api/health
3. OAuth Login: GitHub/Google login works
4. File Upload: Can upload and process files
5. AI Analysis: Gemini AI processing works
6. Database: Data saving properly

📞 Support

Deployment में कोई problem हो तो:

1. Check Logs: Application और error logs देखें
2. Verify Config: All environment variables correct हैं
3. Database: Connection working है
4. File Permissions: Proper read/write permissions हैं

Deployment Successful होने पर: 🎉 Your CodeGuardian Pro is LIVE!

Website: https://yourdomain.com
Admin:https://yourdomain.com/admin
API Docs:https://yourdomain.com/api/docs

---

Last Updated: January 2024
Deployment Version: 1.0.0