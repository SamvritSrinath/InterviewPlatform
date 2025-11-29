# 291Y Interview Platform

Modern LeetCode-style platform with cheating detection for interview environments.

## 🏗️ Architecture

This project is a **single Next.js application** that combines:

- **Interview Platform** - Main interview platform with authentication, sessions, and monitoring
- **Questions Archive** - Public problem repository at `/archive`
- **Honeypot System** - Token-based honeypot detection at `/docs/v1/[token]/[problem_id]`

### Project Structure

```
/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth routes (login, signup)
│   ├── admin/             # Admin routes
│   ├── api/               # API routes
│   ├── archive/           # Questions archive
│   ├── dashboard/         # Dashboard
│   ├── docs/              # Honeypot routes
│   ├── interview/          # Interview routes
│   ├── q/                 # Public question routes
│   └── ...
├── components/            # React components
│   ├── interview/         # Interview-specific components
│   └── questions/         # Questions-specific components
├── lib/                   # Shared utilities
│   ├── supabase/          # Supabase clients and auth
│   └── utils/             # Utility functions
└── scripts/               # Database migration scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm
- Supabase account and project

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will start on `http://localhost:3000`

### Database Setup

Run the migration scripts in Supabase SQL Editor:

```sql
-- See scripts/ directory for migration files
```

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide
- **[COMMANDS.md](./COMMANDS.md)** - Quick command reference
- **[VERCEL_SETUP.md](./VERCEL_SETUP.md)** - Vercel deployment guide

## 🛠️ Available Commands

### Development
```bash
npm run dev      # Start development server
npm run build   # Build for production
npm run start   # Start production server
npm run lint    # Run linter
npm run clean   # Clean build artifacts
```

## 🚢 Deployment

### Vercel (Recommended)

This app is configured for single Vercel deployment.

**Quick Setup:**
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

The `vercel.json` file is already configured with the correct build settings.

## 🎯 Features

### Interview Platform
- Real-time coding interviews with Monaco editor
- Cheating detection (tab switching, copy-paste, LLM API calls)
- Session management and analytics
- Problem repository with solutions

### AI Detection System
- **LLM Traffic Detection** - Detects AI crawlers (OpenAI, Anthropic, Google, Perplexity)
- **Honeypot System** - Token-based detection with wrong answers
- **IP Matching** - Correlates access patterns with interview sessions
- **Temporal Correlation** - Detects suspicious activity during active interviews

### Wrong Answer System
- Problems can have intentionally wrong solutions
- Wrong answers displayed on honeypot routes
- Detects when candidates use LLMs that scrape the site

## 🔧 Technology Stack

- **Framework**: Next.js 16
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI**: Material-UI, Tailwind CSS
- **Code Editor**: Monaco Editor
- **Language**: TypeScript

## 📝 License

Private project for CSE 291Y.

## 🤝 Contributing

This is a private academic project. For questions or issues, contact the project maintainers.
