# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 8080) - Note: API routes won't work
npm run dev:vercel   # Start Vercel dev server with API routes (recommended)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Important: Local Development with API Routes

The application uses Vercel serverless functions for API routes (`/api/*`). When running locally:

1. **For full functionality** (including GitHub integration): Use `npm run dev:vercel`
   - This runs the Vercel dev server which handles both frontend and API routes
   - First time setup may ask you to link to a Vercel project (you can skip this)

2. **For frontend-only development**: Use `npm run dev`
   - This runs only the Vite dev server
   - API routes will return 404 errors
   - GitHub integration features won't work

## Architecture Overview

This is a GitHub release notes generator built with Vite, React, TypeScript, and Shadcn/ui components.

### Core Functionality Flow
1. User inputs GitHub repository URL and optional PAT in `RepoForm`
2. App fetches repository tags/branches via `githubApi.ts`
3. User selects two references (from/to) for comparison
4. `releaseNotesGenerator.ts` fetches commits and categorizes them
5. `ReleaseNotesPreview` displays formatted markdown with export options

### Key Files
- `src/pages/Index.tsx`: Main orchestration of the release notes workflow
- `src/lib/githubApi.ts`: GitHub API integration using Octokit
- `src/lib/releaseNotesGenerator.ts`: Core logic for commit categorization and markdown generation
- `src/components/RepoForm.tsx`: Repository input and reference selection
- `src/components/ReleaseNotesPreview.tsx`: Display and export functionality

### Commit Categorization
The app categorizes commits based on conventional commit patterns:
- **Features**: `feat:` prefix
- **Bug Fixes**: `fix:` prefix  
- **Breaking Changes**: `BREAKING CHANGE:` in body or `!` after type
- **Other Changes**: Everything else

### UI Components
Uses Shadcn/ui components from `src/components/ui/` with Tailwind CSS for styling. The app has a clean, minimal interface focused on the release notes generation workflow.

## Authentication
The app uses Supabase Auth with GitHub OAuth for secure authentication:
- Users must sign in with GitHub to access the app
- GitHub access token is managed by Supabase
- OAuth scopes include `repo` and `read:user` for private repository access

### Environment Variables
Required environment variables (create `.env` file):
```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Important Notes
- No test infrastructure currently exists
- Uses Vite's default port 8080 (configured in vite.config.ts)
- GitHub API rate limits: 5000/hour with authenticated requests
- All users must authenticate via GitHub OAuth to use the app