CodeGuardian Pro - Setup Guide

🚀 Local Development Setup (आसान तरीका)

जरूरी चीजें पहले Install करें:

```bash
# 1. Node.js (v18 या उपर)
# Download from: https://nodejs.org

# 2. Git
# Download from: https://git-scm.com

# 3. Code Editor (VS Code Recommended)
# Download from: https://code.visualstudio.com
```

📥 Project Setup - Step by Step

Step 1: Project Download करें

```bash
# Terminal खोलें और ये commands run करें:

# GitHub से code download करें
git clone https://github.com/yourusername/codeguardian-pro.git

# Project folder में जाएं
cd codeguardian-pro

# VS Code में open करें
code .
```

Step 2: Dependencies Install करें

```bash
# सभी necessary packages install होंगे
npm install

# या फिर
yarn install
```

Step 3: Environment Setup

.env.development file create करें:

```env
# Database (SQLite use करेंगे - आसान है)
DATABASE_URL="file:./dev.db"

# GitHub OAuth (Optional - बिना भी काम चलेगा)
GITHUB_CLIENT_ID="dev_test_id"
GITHUB_CLIENT_SECRET="dev_test_secret"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="dev_test_id"
GOOGLE_CLIENT_SECRET="dev_test_secret"

# Gemini AI (Test mode)
GEMINI_API_KEY="demo_key_123"

# Development Settings
NODE_ENV=development
PORT=3000
```

Step 4: Database Setup

```bash
# Database tables create होंगे
npx prisma generate
npx prisma db push

# Test data add करें (optional)
npx prisma db seed
```

Step 5: Project Start करें

```bash
# Development server start करें
npm run dev

# या फिर
yarn dev
```

✅ हो गया! अब open करें: http://localhost:3000

🛠️ Advanced Setup (अगर ऊपर वाला काम न करे)

Option A: Docker के साथ (सबसे आसान)

```bash
# 1. Docker Desktop install करें
# https://www.docker.com/products/docker-desktop

# 2. Project folder में ये command run करें
docker-compose up -d

# 3. Website open करें
# http://localhost:3000
```

Option B: Manual Database Setup

```bash
# 1. PostgreSQL install करें
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt install postgresql

# 2. Database create करें
createdb codeguardian_dev

# 3. .env file update करें
DATABASE_URL="postgresql://username:password@localhost:5432/codeguardian_dev"
```

🔑 API Keys Setup (Optional)

GitHub OAuth Setup:

1. https://github.com/settings/developers पर जाएं
2. "New OAuth App" click करें
3. ये information fill करें:
   · Application name: CodeGuardian Pro (Dev)
   · Homepage URL: http://localhost:3000
   · Authorization callback URL: http://localhost:3000/api/auth/github/callback

Google OAuth Setup:

1. https://console.cloud.google.com/ पर जाएं
2. New project create करें
3. "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
4. Authorized redirect URIs में add करें: http://localhost:3000/api/auth/google/callback

Gemini AI Setup:

1. https://makersuite.google.com/app/apikey पर जाएं
2. "Create API Key" click करें
3. Key copy करके .env file में paste करें

🎯 First Time Use Guide

Website Test करें:

1. Homepage: http://localhost:3000
   · सभी features दिख रहे हैं?
   · Get Started button काम कर रहा है?
2. Upload Page: http://localhost:3000/upload
   · Direct file upload try करें
   · Test file: कोई भी .js या .txt file
3. Demo Mode:
   · बिना login के "Continue as Guest" click करें
   · Sample project upload करके test करें

Test File बनाएं:

test-project/index.js

```javascript
function calculateSum(a, b) {
  return a + b
}

console.log("Hello World")
```

इस file को upload करके देखें कि AI analysis ठीक work कर रही है।

🔧 Development Tools Setup

VS Code Extensions Install करें:

```bash
# Recommended extensions:
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- TypeScript Importer
- Auto Rename Tag
- Thunder Client (API testing)
```

Browser Extensions:

· React Developer Tools
· Redux DevTools (अगर Redux use कर रहे हैं)

📁 Project Structure समझें

```
codeguardian-pro/
├── src/                    # Frontend code
│   ├── components/         # React components
│   ├── services/           # API services
│   ├── styles/             # CSS files
│   └── App.tsx            # Main app component
├── server/                 # Backend code
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── server.js          # Server entry point
├── prisma/                 # Database schema
├── public/                 # Static files
└── package.json           # Project dependencies
```

🐛 Common Problems & Solutions

Problem 1: npm install error

```bash
# Solution:
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

Problem 2: Port already in use

```bash
# Solution:
# Change port in .env file
PORT=3001

# OR kill process using port
npx kill-port 3000
```

Problem 3: Database connection error

```bash
# Solution:
npx prisma generate
npx prisma db push
```

Problem 4: Build errors

```bash
# Solution:
npm run build

# Errors fix करें, फिर:
npm run dev
```

🎮 Useful Development Commands

```bash
# Development server start
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Database operations
npx prisma studio    # Database GUI open करेगा
npx prisma db seed   # Test data add करेगा

# Code formatting
npm run format

# Linting check
npm run lint
```

🔍 Testing Your Setup

Basic Tests Run करें:

```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# All tests
npm test
```

Manual Test Checklist:

· Website http://localhost:3000 open हो रही है
· Homepage सही दिख रही है
· File upload काम कर रहा है
· AI analysis हो रही है
· Results page दिख रहा है
· No errors in console

📞 Help & Support

अगर कोई problem हो:

1. Error Messages: Screenshot लें
2. Console Logs: Browser console में errors check करें
3. Terminal Output: Development server के logs देखें

Online Help:

· GitHub Issues पर problem report करें
· Documentation check करें
· Community forum में पूछें

🎉 Congratulations!

आपका CodeGuardian Pro development environment तैयार है! 🚀

अब आप:

· ✅ Code changes कर सकते हैं
· ✅ New features add कर सकते हैं
· ✅ Bugs fix कर सकते हैं
· ✅ Website test कर सकते हैं

Happy Coding! 💻

---

Setup Version: 1.0.0
Last Updated: January 2024