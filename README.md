# I am Released - GitHub Release Notes Generator

A secure web application that generates beautiful release notes from your GitHub repository's commit history. Supports both public and private repositories through GitHub OAuth authentication.

## Features

- 🔐 Secure GitHub OAuth authentication via Supabase
- 📝 Automatic commit categorization (features, fixes, breaking changes)
- 🏷️ Support for both tags and branch comparisons
- 🔒 Access to both public and private repositories
- 📋 Copy to clipboard or download as Markdown
- 🎨 Clean, modern UI with dark mode support
- ✨ AI-powered enhancement to make release notes more engaging (OpenAI)

## Prerequisites

Before setting up this project, you'll need:

1. **Node.js & npm** - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
2. **A Supabase account** - [Sign up for free](https://supabase.com)
3. **A GitHub account** - For creating OAuth App

## Setup Instructions

### 1. Clone and Install

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd I-am-released

# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env
```

### 2. Set up Supabase

1. **Create a new Supabase project**
   - Go to [app.supabase.com](https://app.supabase.com)
   - Click "New project"
   - Fill in the project details

2. **Get your Supabase credentials**
   - Go to Project Settings → API
   - Copy:
     - `Project URL` → `VITE_SUPABASE_URL` in `.env`
     - `anon public` key → `VITE_SUPABASE_ANON_KEY` in `.env`

3. **Configure Authentication URLs**
   - Go to Authentication → URL Configuration
   - Add to "Redirect URLs":
     ```
     http://localhost:8080/auth/callback
     http://localhost:5173/auth/callback
     https://your-domain.com/auth/callback
     ```
   - Save changes

### 3. Set up GitHub OAuth

1. **Create a GitHub OAuth App**
   - Go to GitHub → Settings → Developer settings → OAuth Apps
   - Click "New OAuth App"
   - Fill in:
     - **Application name**: "I am Released" (or your choice)
     - **Homepage URL**: `http://localhost:8080` (or your domain)
     - **Authorization callback URL**: `https://[your-supabase-project-ref].supabase.co/auth/v1/callback`
       - Find your project ref in Supabase project settings
   - Click "Register application"

2. **Copy OAuth credentials**
   - Copy the **Client ID**
   - Generate a new **Client Secret** and copy it

3. **Configure Supabase with GitHub OAuth**
   - In Supabase, go to Authentication → Providers
   - Find GitHub and click to configure
   - Enable GitHub provider
   - Paste your Client ID and Client Secret
   - Leave "Authorized domains" empty (Supabase will handle it)
   - Save

### 4. Configure Environment Variables

Edit your `.env` file:

```env
VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_OPENAI_API_KEY=your-openai-api-key-here (optional, for AI enhancement)
```

### 5. Run the Application

```bash
# Start the development server
npm run dev

# The app will be available at http://localhost:8080
```

## Deployment

### Deploy to Vercel

1. **Push your code to GitHub**

2. **Import project in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository

3. **Configure environment variables in Vercel**
   - Add the following environment variables:
     - `VITE_SUPABASE_URL`: Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
     - `VITE_SITE_URL`: Your Vercel app URL (e.g., `https://your-app.vercel.app`)
     - `VITE_OPENAI_API_KEY`: Your OpenAI API key (optional, for AI enhancement)

4. **Update Supabase redirect URLs**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel domain to "Redirect URLs":
     - `https://your-app.vercel.app/auth/callback`
   - Save the changes

5. **Deploy!**

## Usage

1. Visit the application
2. Click "Sign in with GitHub"
3. Authorize the application to access your repositories
4. Click "Select a repository" to browse your repositories
5. Search and select from your public and private repositories
6. Click "Load Tags" to fetch available tags
7. Select start and end references (tags or commits)
8. (Optional) Toggle "Enhance with AI" for more engaging release notes
9. Click "Generate Release Notes"
10. Copy or download your release notes!

## Troubleshooting

### "Authentication error: Error getting user profile from external provider"
- Ensure your GitHub OAuth App callback URL exactly matches: `https://[your-supabase-project-ref].supabase.co/auth/v1/callback`
- Verify Client ID and Secret are correctly copied to Supabase

### "invalid request: both auth code and code verifier should be non-empty"
- Clear browser cache and cookies
- Ensure you're using an OAuth App, not a GitHub App

### User stays on login page after authentication
- Check that your redirect URLs in Supabase include your exact domain with port
- Verify environment variables are loaded correctly

## Development

### Tech Stack
- **Frontend**: React, TypeScript, Vite
- **UI**: Shadcn/ui, Tailwind CSS
- **Authentication**: Supabase Auth with GitHub OAuth
- **API**: GitHub REST API via Octokit

### Project Structure
```
src/
├── components/       # React components
├── contexts/        # Auth context
├── lib/            # Utilities and API clients
├── pages/          # Page components
└── types/          # TypeScript types
```

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.