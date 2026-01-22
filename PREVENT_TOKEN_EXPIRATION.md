# How to Prevent Google Refresh Token Expiration

## Why Refresh Tokens Expire

Google refresh tokens can expire or be revoked for several reasons:

1. **App is in "Testing" mode** → Tokens expire after **7 days** ⚠️
2. **Token unused for 6 months** → Google may revoke it
3. **User revokes access** → Token is immediately invalid
4. **User changes password** (with Gmail scopes) → Token may be revoked
5. **Too many refresh tokens** → Older ones get invalidated (limit per app×user)

## Critical: Move Your App to Production

**The #1 reason tokens expire quickly is having your app in "Testing" mode.**

### Step 1: Check Your OAuth Consent Screen Status

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **OAuth consent screen**
3. Check the **"Publishing status"** at the top

### Step 2: Publish Your App to Production

If it says **"Testing"**, you need to publish it:

**⚠️ IMPORTANT:** If you get an error about non-HTTPS URLs (localhost), see [FIX_PRODUCTION_PUBLISHING.md](./FIX_PRODUCTION_PUBLISHING.md) for the solution.

1. **Complete all required fields:**
   - App name
   - User support email
   - Developer contact information
   - App logo (optional but recommended)
   - Privacy policy URL (required for production)
   - Terms of service URL (optional)

2. **Add scopes:**
   - Make sure your required scopes are listed
   - For Drive access: `https://www.googleapis.com/auth/drive.readonly`
   - For file uploads: `https://www.googleapis.com/auth/drive.file`

3. **Add test users (if needed):**
   - In Testing mode, only test users can authorize
   - In Production, any Google user can authorize

4. **Submit for verification (if using sensitive scopes):**
   - Some scopes require Google verification
   - This can take a few days to weeks
   - For Drive API, verification is usually required

5. **Click "PUBLISH APP"** button

**Important:** Once published, refresh tokens will last much longer (not just 7 days).

## Best Practices to Prevent Expiration

### 1. ✅ Use Your App Regularly

- **Refresh tokens expire after 6 months of non-use**
- Your app automatically refreshes access tokens when making API calls
- As long as your app is active, the refresh token stays valid

### 2. ✅ Store New Refresh Tokens

Sometimes Google returns a new refresh token when you refresh the access token. Your code should:
- Check if a new refresh token is returned
- Update your stored refresh token
- Save it to your environment variables

### 3. ✅ Use `access_type=offline` and `prompt=consent`

Your code already does this correctly:
```typescript
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',  // ✅ Gets refresh token
  scope: scopes,
  prompt: 'consent',        // ✅ Forces consent screen
});
```

### 4. ✅ Don't Create Too Many Refresh Tokens

- Google limits the number of refresh tokens per user
- Creating too many invalidates older ones
- Reuse existing tokens when possible

### 5. ✅ Handle Token Refresh Errors Gracefully

Your app should:
- Catch `invalid_grant` errors
- Prompt user to re-authorize
- Provide clear error messages

## Implementation: Auto-Update Refresh Tokens

I'll update your code to automatically save new refresh tokens when Google provides them.

## Monitoring Token Health

### Check Token Status

Run this command periodically to verify your token is still valid:

```bash
npm run test-drive
```

If you see "invalid_grant" errors, you need a new refresh token.

### Set Up Alerts (Optional)

For production, consider:
- Monitoring API error rates
- Alerting on `invalid_grant` errors
- Logging token refresh events

## Quick Checklist

- [ ] **Move OAuth app to Production** (most important!)
- [ ] Complete all required OAuth consent screen fields
- [ ] Submit for verification if needed
- [ ] Use the app regularly (at least once every 6 months)
- [ ] Monitor for token errors
- [ ] Update refresh tokens when Google provides new ones

## Troubleshooting

### "Token expired after 7 days"
→ Your app is still in Testing mode. Publish it to Production.

### "Token expired after 6 months"
→ The app wasn't used. Make sure to use it regularly or set up automated tasks.

### "Too many refresh tokens"
→ You're creating new tokens too often. Reuse existing ones.

### "User revoked access"
→ User manually revoked access in their Google account settings. They need to re-authorize.

## Next Steps

1. **Check your OAuth consent screen status** in Google Cloud Console
2. **Publish to Production** if still in Testing
3. **Get a new refresh token** after publishing (old testing tokens won't work)
4. **Update your code** to handle new refresh tokens automatically
