# GitHub OAuth Troubleshooting Guide

## Error: "Error getting user profile from external provider"

This error typically occurs when Supabase cannot retrieve user information from GitHub after authentication.

### Quick Fixes

1. **Check GitHub Email Privacy Settings**
   - Go to GitHub → Settings → Emails
   - Uncheck "Keep my email addresses private"
   - OR add your Supabase project email to allowed services

2. **Clear Browser Data**
   - Clear cookies and cache for your app domain
   - Clear cookies for `github.com` and `supabase.co`
   - Try in an incognito/private window

3. **Verify OAuth App Configuration**
   ```
   GitHub OAuth App:
   - Authorization callback URL: https://YOUR_PROJECT.supabase.co/auth/v1/callback
   
   Supabase Dashboard:
   - Site URL: http://localhost:5173 (development)
   - Redirect URLs: http://localhost:5173/auth/callback
   ```

### Detailed Debugging Steps

1. **Enable Console Logging**
   - Open browser DevTools
   - Check for specific error messages
   - Look for CORS errors or blocked requests

2. **Test OAuth Flow Manually**
   ```bash
   # Test if GitHub OAuth endpoint is accessible
   curl -I https://github.com/login/oauth/authorize
   ```

3. **Verify Supabase Configuration**
   ```javascript
   // Check if Supabase client is initialized correctly
   console.log(supabase.auth.getSession())
   ```

### Alternative Solutions

#### Use Personal Access Token
Instead of OAuth, use a GitHub Personal Access Token:

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` and `user:email` scopes
3. Use the GitHubTokenForm component in your app

#### Use Supabase Edge Functions
Create a proxy function to handle GitHub authentication:

```typescript
// supabase/functions/github-auth/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { code } = await req.json()
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: Deno.env.get('GITHUB_CLIENT_ID'),
      client_secret: Deno.env.get('GITHUB_CLIENT_SECRET'),
      code,
    }),
  })
  
  const { access_token } = await tokenResponse.json()
  
  // Get user info
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${access_token}`,
    },
  })
  
  const userData = await userResponse.json()
  
  return new Response(JSON.stringify({ userData, access_token }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### Common Configuration Mistakes

1. **Wrong Redirect URL Format**
   - ❌ `http://localhost:5173/auth/callback/`
   - ✅ `http://localhost:5173/auth/callback`

2. **Missing OAuth Scopes**
   - ❌ `scopes: 'repo'`
   - ✅ `scopes: 'user:email read:user repo'`

3. **Incorrect Supabase Project URL**
   - ❌ `https://supabase.co/project/YOUR_PROJECT`
   - ✅ `https://YOUR_PROJECT.supabase.co`

### Testing Checklist

- [ ] GitHub OAuth App is not suspended
- [ ] Supabase project is not paused
- [ ] Browser allows third-party cookies
- [ ] No VPN/proxy blocking requests
- [ ] GitHub account has verified email
- [ ] OAuth app has correct permissions
- [ ] Redirect URLs match exactly (no trailing slashes)
- [ ] Using HTTPS in production
- [ ] No ad blockers interfering