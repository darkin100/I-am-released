# GitHub Authentication Troubleshooting

## Issue: "GitHub authentication required. Please sign out and sign in again"

This error occurs when the GitHub provider token is not properly stored in the user's session during OAuth authentication.

### Root Cause

The issue is likely in the Supabase GitHub OAuth configuration. When users sign in with GitHub, Supabase should store the GitHub access token as a `provider_token` in the session, but this isn't happening.

### Solution Steps

#### 1. Check Supabase GitHub OAuth Configuration

1. Go to your Supabase dashboard
2. Navigate to Authentication → Providers → GitHub
3. Verify the configuration:
   - **Client ID**: Should be from your GitHub OAuth App
   - **Client Secret**: Should be from your GitHub OAuth App
   - **Redirect URL**: Should be `https://[your-project-ref].supabase.co/auth/v1/callback`

#### 2. Check GitHub OAuth App Configuration

1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Select your "I am Released" app
3. Verify:
   - **Authorization callback URL**: `https://[your-supabase-project-ref].supabase.co/auth/v1/callback`
   - **Homepage URL**: Your app's domain

#### 3. Verify OAuth Scopes

The GitHub OAuth should request these scopes:
- `repo` (to access private repositories)
- `read:user` (to get user information)

In Supabase, these should be configured in the GitHub provider settings under "Scopes".

#### 4. Test the OAuth Flow

1. Sign out completely from your app
2. Sign in again with GitHub
3. During the GitHub authorization screen, verify that the permissions requested include repository access

#### 5. Check Supabase Logs

1. Go to Supabase dashboard → Logs
2. Look for any errors during the OAuth flow
3. Check if the `provider_token` is being stored

### Common Issues

1. **Wrong Callback URL**: The most common issue is a mismatch between the GitHub OAuth app callback URL and what's configured in Supabase.

2. **Missing Scopes**: If the `repo` scope isn't requested, the provider token might not have the necessary permissions.

3. **Supabase Configuration**: Sometimes the GitHub provider in Supabase needs to be reconfigured.

### Manual Fix (Temporary)

If the issue persists, users can:
1. Go to GitHub → Settings → Applications → Authorized OAuth Apps
2. Find "I am Released" and click "Revoke"
3. Sign out of your app completely
4. Sign in again with GitHub

This forces a fresh OAuth flow that should properly store the provider token.

### Testing

After making configuration changes:
1. Clear browser cache/cookies
2. Use an incognito/private window
3. Sign in with GitHub again
4. The error should be resolved

If the issue persists, check the Vercel logs for detailed error information about where the token retrieval is failing.