# How to Connect Google Drive to OAuth 2.0

This guide will walk you through connecting your Google Drive to your application using OAuth 2.0.

## Prerequisites

Before starting, make sure you have:
1. ✅ Created OAuth 2.0 credentials in Google Cloud Console (Client ID and Secret)
2. ✅ Added them to your `.env.local` file
3. ✅ Enabled Google Drive API in your Google Cloud project

If you haven't done this yet, see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) first.

## Step-by-Step Connection Process

### Step 1: Set Up Your Environment Variables

Make sure your `.env.local` file has these values:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3003/api/auth/google/callback
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
```

**Note**: You don't have the `GOOGLE_REFRESH_TOKEN` yet - we'll get that in the next steps.

### Step 2: Start Your Development Server

```bash
npm run dev
```

Your server should start at `http://localhost:3003`

### Step 3: Get the Authorization URL

Open your browser and visit:

```
http://localhost:3003/api/auth/google
```

You should see a JSON response like this:

```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### Step 4: Authorize the Application

1. **Copy the `authUrl`** from the JSON response
2. **Paste it into your browser** and press Enter
3. You'll be redirected to Google's sign-in page
4. **Sign in** with the Google account that has access to your Drive folder
5. You'll see a consent screen asking for permissions:
   - "See and download all your Google Drive files"
   - Click **"Allow"** or **"Continue"**

### Step 5: Get Your Refresh Token

After authorizing, you'll be automatically redirected to:

```
http://localhost:3003/api/auth/google/callback?code=...
```

You should see a JSON response like this:

```json
{
  "success": true,
  "message": "Authorization successful. Please save the refresh_token to your environment variables.",
  "refresh_token": "1//0gXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

### Step 6: Save Your Refresh Token

1. **Copy the `refresh_token`** value from the response
2. **Add it to your `.env.local` file**:

```env
GOOGLE_REFRESH_TOKEN=1//0gXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

3. **Restart your development server** (stop with Ctrl+C and run `npm run dev` again)

### Step 7: Verify the Connection

You can test the connection in several ways:

#### Option A: Test via API Endpoint

Visit this URL in your browser (replace `YOUR_FOLDER_ID` with your actual folder ID):

```
http://localhost:3003/api/google-drive/sync?folderId=YOUR_FOLDER_ID
```

Or use curl:

```bash
curl -X POST "http://localhost:3003/api/google-drive/sync?folderId=YOUR_FOLDER_ID"
```

If successful, you'll see a JSON response listing the files in your folder.

#### Option B: Use the Test Component

I've created a test component you can add to your app (see below).

## How It Works

Once connected, here's what happens:

1. **Your app uses the Refresh Token** to get a new Access Token whenever needed
2. **The Access Token** is used to make API calls to Google Drive
3. **The connection persists** - you don't need to re-authorize unless you revoke access

## Troubleshooting

### "Invalid grant" or "Token has been expired or revoked"

- Your refresh token may have expired or been revoked
- **Solution**: Repeat Steps 3-6 to get a new refresh token

### "Redirect URI mismatch"

- The redirect URI in your OAuth client doesn't match what's in your `.env.local`
- **Solution**: 
  1. Go to Google Cloud Console > APIs & Services > Credentials
  2. Edit your OAuth 2.0 Client ID
  3. Make sure the redirect URI matches exactly: `http://localhost:3003/api/auth/google/callback`

### "Access denied" or "Insufficient permissions"

- The OAuth scopes might not be set correctly
- **Solution**: Make sure your OAuth client has these scopes:
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/drive.metadata.readonly`

### "Folder not found"

- The folder ID might be incorrect
- **Solution**: 
  1. Open your Google Drive folder in a browser
  2. Look at the URL: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
  3. Copy the folder ID and update `.env.local`

## Security Notes

- ⚠️ **Never commit your `.env.local` file** to Git (it's already in `.gitignore`)
- ⚠️ **Keep your refresh token secure** - treat it like a password
- ⚠️ **For production (Vercel)**, add all environment variables in Vercel's project settings

## Next Steps

Once connected, you can:

1. **Sync your Drive files** to Pinecone using the `/api/google-drive/sync` endpoint
2. **Use the chat interface** to ask questions about your documents
3. **Process documents** using the document processor

## Quick Reference

- **Get Auth URL**: `GET /api/auth/google`
- **OAuth Callback**: `GET /api/auth/google/callback`
- **Sync Drive Files**: `POST /api/google-drive/sync?folderId=YOUR_FOLDER_ID`





