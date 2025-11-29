# 291Y Interview Platform

Modern LeetCode-style platform with cheating detection for interview environments, built as a Turborepo monorepo.

## 🏗️ Architecture

This project uses a **Turborepo monorepo** structure with:

- **apps/interview** - Main interview platform (Next.js)
- **apps/questions** - Honeypot question site for AI detection (Next.js)
- **packages/** - Shared code:
  - `supabase-client` - Database types, Supabase clients, auth utilities
  - `utils` - LLM detection, IP matching, validation schemas
  - `ui` - Shared UI components (placeholder)
  - `config` - Shared configuration (placeholder)

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Supabase account and project

### Installation

```bash
npm install
```

### Development

```bash
# Start interview app (port 3000)
npm run dev:interview

# Start questions app (port 3001) - in another terminal
npm run dev:questions

# Or start both in parallel
npm run dev:all
```

### Database Setup

Run the migration script in Supabase SQL Editor:

```sql
-- See scripts/add-wrong-answer-fields.sql
```

### Environment Variables

See `SETUP.md` for detailed environment variable configuration.

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide
- **[COMMANDS.md](./COMMANDS.md)** - Quick command reference
- **[VERCEL_SETUP.md](./VERCEL_SETUP.md)** - Vercel deployment guide
- **[MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)** - Migration details
- **[CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)** - Repository cleanup summary

## 🛠️ Available Commands

### Development
```bash
npm run dev:interview    # Start interview app
npm run dev:questions    # Start questions app
npm run dev:all         # Start both apps
```

### Building
```bash
npm run build:interview  # Build interview app
npm run build:questions  # Build questions app
npm run build:all       # Build all apps
```

### Linting
```bash
npm run lint:interview  # Lint interview app
npm run lint:questions  # Lint questions app
npm run lint:all        # Lint all apps
```

### Utilities
```bash
npm run clean          # Clean caches and node_modules
```

See [COMMANDS.md](./COMMANDS.md) for complete command reference.

## 🚢 Deployment

### Vercel (Recommended)

This monorepo is configured for Vercel deployment. See [VERCEL_SETUP.md](./VERCEL_SETUP.md) for detailed instructions.

**Quick Setup:**
1. Create two separate Vercel projects from the same repository
2. Configure build commands:
   - Interview: `turbo run build --filter=interview`
   - Questions: `turbo run build --filter=questions`
3. Set environment variables for each project

### Key Vercel Settings

**Interview App:**
- Root Directory: `apps/interview`
- Build Command: `cd ../.. && turbo run build --filter=interview`
- Output Directory: `.next` (auto-detected by Next.js)
- Install Command: `cd ../.. && npm install`

**Questions App:**
- Root Directory: `apps/questions`
- Build Command: `cd ../.. && turbo run build --filter=questions`
- Output Directory: `.next` (auto-detected by Next.js)
- Install Command: `cd ../.. && npm install`

## 🎯 Features

### Interview Platform
- Real-time coding interviews with Monaco editor
- Cheating detection (tab switching, copy-paste, LLM API calls)
- Session management and analytics
- Problem repository with solutions

### AI Detection System
- **LLM Traffic Detection** - Detects AI crawlers (OpenAI, Anthropic, Google, Perplexity)
- **Honeypot Site** - Separate question site with wrong answers
- **IP Matching** - Correlates access patterns with interview sessions
- **Temporal Correlation** - Detects suspicious activity during active interviews

### Wrong Answer System
- Problems can have intentionally wrong solutions
- Wrong answers displayed on honeypot site
- Detects when candidates use LLMs that scrape the site

## 📦 Project Structure

```
/
├── apps/
│   ├── interview/          # Main interview platform
│   └── questions/          # Honeypot question site
├── packages/
│   ├── supabase-client/    # Shared Supabase utilities
│   ├── utils/              # Shared utilities
│   ├── ui/                 # Shared UI components
│   └── config/             # Shared configuration
├── scripts/                # Database migration scripts
└── turbo.json              # Turborepo configuration
```

## 🔧 Technology Stack

- **Framework**: Next.js 16
- **Monorepo**: Turborepo
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI**: Material-UI, Tailwind CSS
- **Code Editor**: Monaco Editor
- **Language**: TypeScript

## 📝 License

Private project for CSE 291Y.

## 🤝 Contributing

This is a private academic project. For questions or issues, contact the project maintainers.
