# Fix Redirect URI Mismatch Error

## The Problem

You're seeing this error:
```
Error 400: redirect_uri_mismatch
```

This means the redirect URI in your Google Cloud Console doesn't match what your application is trying to use.

## Quick Fix Steps

### Step 1: Check Your Current Redirect URI

Your application expects this redirect URI:
```
http://localhost:3003/api/auth/google/callback
```

**Important**: Make sure this EXACT URI is in your Google Cloud Console.

### Step 2: Add/Update Redirect URI in Google Cloud Console

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Select your project** (the one with your OAuth credentials)
3. **Navigate to**: APIs & Services → Credentials
4. **Find your OAuth 2.0 Client ID** (the one you created earlier)
5. **Click the edit/pencil icon** (✏️) next to your OAuth client
6. **Scroll down to "Authorized redirect URIs"**
7. **Click "+ ADD URI"**
8. **Add this EXACT URI** (copy and paste to avoid typos):
   ```
   http://localhost:3003/api/auth/google/callback
   ```
9. **Click "SAVE"** at the bottom of the page

### Step 3: Verify Your .env.local File

Make sure your `.env.local` file has the matching redirect URI:

```env
GOOGLE_REDIRECT_URI=http://localhost:3003/api/auth/google/callback
```

**Important Notes:**
- Use `http://` (not `https://`) for localhost
- Use `localhost` (not `127.0.0.1`)
- Include the full path: `/api/auth/google/callback`
- No trailing slash

### Step 4: Restart Your Development Server

After making changes:
1. Stop your server (Ctrl+C)
2. Restart it: `npm run dev`
3. Try the authorization again

## Common Mistakes to Avoid

❌ **Wrong**: `https://localhost:3003/api/auth/google/callback` (should be http)
❌ **Wrong**: `http://127.0.0.1:3003/api/auth/google/callback` (should be localhost)
❌ **Wrong**: `http://localhost:3003/api/auth/google/callback/` (no trailing slash)
❌ **Wrong**: `http://localhost:3003/` (missing the callback path)

✅ **Correct**: `http://localhost:3003/api/auth/google/callback`

## For Production (Vercel)

When deploying to Vercel, you'll need to add your production redirect URI:

1. **Get your Vercel URL** (e.g., `https://your-app.vercel.app`)
2. **Add this redirect URI** in Google Cloud Console:
   ```
   https://your-app.vercel.app/api/auth/google/callback
   ```
3. **Update your Vercel environment variables**:
   ```
   GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback
   ```

## Visual Guide

In Google Cloud Console, your "Authorized redirect URIs" section should look like this:

```
┌─────────────────────────────────────────────────────────────┐
│ Authorized redirect URIs                                    │
├─────────────────────────────────────────────────────────────┤
│ http://localhost:3003/api/auth/google/callback             │
│                                                             │
│ [+ ADD URI]                                                 │
└─────────────────────────────────────────────────────────────┘
```

## Still Having Issues?

### Check 1: Verify the URI is Saved
- Go back to Credentials → Your OAuth Client
- Make sure the URI appears in the list
- If it's not there, add it again and click SAVE

### Check 2: Wait a Few Minutes
- Sometimes Google takes a few minutes to propagate changes
- Wait 2-3 minutes and try again

### Check 3: Clear Browser Cache
- Clear your browser cache or try in an incognito/private window
- Sometimes cached OAuth responses can cause issues

### Check 4: Verify Environment Variables
Run this command to check if your environment variable is set:
```bash
# In your terminal, in the project directory
echo $GOOGLE_REDIRECT_URI
```

Or check your `.env.local` file directly.

## Testing the Fix

1. Make sure your server is running: `npm run dev`
2. Visit: `http://localhost:3003/api/auth/google`
3. Copy the `authUrl` from the response
4. Open it in your browser
5. You should now be able to authorize without the redirect_uri_mismatch error

## Need More Help?

If you're still seeing the error after following these steps:
1. Double-check that you clicked "SAVE" in Google Cloud Console
2. Verify there are no extra spaces or characters in the URI
3. Make sure you're using the correct OAuth Client ID (check the Client ID matches in both places)





