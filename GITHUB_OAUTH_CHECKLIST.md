# GitHub OAuth Configuration Checklist

## ✅ Verify These Settings Match EXACTLY

### 1. GitHub OAuth App Settings
Go to: GitHub → Settings → Developer settings → OAuth Apps → Your App

- **Authorization callback URL**: 
  ```
  https://umgfswunofchzlmpdqlh.supabase.co/auth/v1/callback
  ```
  ⚠️ This MUST be your Supabase URL, NOT your app URL!

### 2. Supabase GitHub Provider Settings
Go to: Supabase Dashboard → Authentication → Providers → GitHub

- **Client ID**: Must match your GitHub OAuth app's Client ID
- **Client Secret**: Must match your GitHub OAuth app's Client Secret
- **Authorized Client IDs**: Leave empty (unless you have specific requirements)

### 3. Supabase URL Configuration
Go to: Supabase Dashboard → Authentication → URL Configuration

- **Site URL**: `https://iamreleased.glyndarkin.co.uk`
- **Redirect URLs**: Should include:
  ```
  https://iamreleased.glyndarkin.co.uk/auth/callback
  ```

### 4. Test OAuth Configuration

1. **Generate New Client Secret**:
   - Go to your GitHub OAuth app
   - Click "Generate a new client secret"
   - Copy the new secret IMMEDIATELY (you can't see it again)
   - Update it in Supabase GitHub provider settings

2. **Clear Everything and Test**:
   - Clear all browser cookies/cache
   - Open incognito/private window
   - Try signing in

### 5. Common Issues

#### "Unable to exchange external code"
This error means Supabase received the code but couldn't exchange it. Usually caused by:
- ❌ Wrong client secret in Supabase
- ❌ Callback URL mismatch
- ❌ Clock skew between servers

#### Quick Fix Steps:
1. Regenerate GitHub OAuth client secret
2. Update it in Supabase immediately
3. Save changes
4. Clear browser data
5. Try again in incognito mode

### 6. Debug Information
When the error occurs, check:
- Browser console for detailed error messages
- Supabase Dashboard → Logs → Auth logs
- Look for "invalid_client" or "invalid_grant" errors

### 7. Nuclear Option
If nothing works:
1. Delete the GitHub OAuth app
2. Create a new one with correct settings
3. Update Supabase with new Client ID and Secret
4. Test again