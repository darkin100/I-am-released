# Fix: Supabase Not Storing GitHub Provider Token

## The Problem
Even though authentication works, Supabase is not storing the GitHub access token (`provider_token`) in the session. This prevents the app from making GitHub API calls.

## Solution: Enable Provider Token Storage in Supabase

### Option 1: Update GitHub Provider Settings (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Authentication → Providers → GitHub**
3. Look for an option called **"Store Provider Tokens"** or similar
4. Enable it if available
5. Save the configuration

### Option 2: Use SQL to Enable Provider Token Storage

If there's no UI option, run this SQL in your Supabase SQL editor:

```sql
-- Check current auth configuration
SELECT * FROM auth.providers WHERE provider = 'github';

-- Update GitHub provider to store tokens
UPDATE auth.providers 
SET 
  created_at = created_at,
  updated_at = now()
WHERE provider = 'github';

-- You may also need to update the flow configuration
-- This depends on your Supabase version
```

### Option 3: Add Custom Configuration

In some Supabase versions, you need to add configuration when setting up the provider:

1. Go to **Authentication → Providers → GitHub**
2. In the **Additional Configuration** field, add:
```json
{
  "store_provider_token": true,
  "scopes": ["repo", "read:user"]
}
```

### Option 4: Re-create the GitHub Provider

If nothing else works:

1. **Disable** the GitHub provider in Supabase
2. Save
3. **Re-enable** it with the correct settings:
   - Client ID: Your GitHub OAuth app client ID
   - Client Secret: Your GitHub OAuth app client secret
   - Ensure all advanced options are properly set
4. Save

### After Making Changes

1. **Sign out** all users
2. Clear browser cache/cookies
3. Sign in again with GitHub
4. The provider token should now be stored

## Verification

After signing in, check if the provider token is stored:

1. Go to Supabase Dashboard → Authentication → Users
2. Click on your user
3. Look for `raw_app_meta_data` or `raw_user_meta_data`
4. Check if `provider_token` is present

## Alternative Workaround

If Supabase still won't store the token, you can use a different approach:

1. Use a GitHub App instead of OAuth App
2. Use Personal Access Tokens (less secure but works)
3. Implement a custom OAuth flow that stores tokens separately

## Debug Commands

Run these in your browser console after signing in:

```javascript
// Check if provider token exists
const { data: { session } } = await supabase.auth.getSession();
console.log('Provider token:', session?.provider_token);
console.log('Provider refresh token:', session?.provider_refresh_token);
```

If both are `undefined`, the tokens aren't being stored.