# Google OAuth 2.0 Setup Guide

## What are Google Client ID and Secret?

The **Google Client ID** and **Client Secret** are credentials that allow your application to authenticate with Google APIs (like Google Drive) on behalf of users. They're part of Google's OAuth 2.0 authentication system.

- **Client ID**: A public identifier for your application (safe to expose in client-side code)
- **Client Secret**: A private key that must be kept secure (never expose in client-side code)

## Step-by-Step Guide to Get Your Credentials

### Step 1: Create or Select a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click the project dropdown at the top of the page
4. Either:
   - **Select an existing project**, OR
   - **Click "New Project"** to create a new one
     - Enter a project name (e.g., "ADA Compliance App")
     - Click "Create"

### Step 2: Enable Google Drive API

1. In your Google Cloud project, go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click on "Google Drive API" from the results
4. Click the **"Enable"** button
5. Wait for the API to be enabled (this may take a minute)

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"** from the dropdown

### Step 4: Configure OAuth Consent Screen (First Time Only)

If this is your first time creating OAuth credentials, you'll need to configure the consent screen:

1. You'll see a prompt to configure the OAuth consent screen - click **"Configure Consent Screen"**
2. Choose **"External"** (unless you have a Google Workspace account, then choose "Internal")
3. Click **"Create"**
4. Fill in the required information:
   - **App name**: "ADA Compliance Advisor" (or your preferred name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **"Save and Continue"**
6. On the "Scopes" page, click **"Save and Continue"** (we'll add scopes later)
7. On the "Test users" page (if external), you can add test users or skip for now
8. Click **"Back to Dashboard"**

### Step 5: Create OAuth Client ID

1. Go back to **APIs & Services** > **Credentials**
2. Click **"+ CREATE CREDENTIALS"** > **"OAuth client ID"**
3. Select **"Web application"** as the application type
4. Give it a name (e.g., "ADA Compliance Web App")
5. Under **"Authorized redirect URIs"**, click **"+ ADD URI"** and add:
   - For local development: `http://localhost:3003/api/auth/google/callback`
   - For production (Vercel): `https://your-app-name.vercel.app/api/auth/google/callback`
6. Click **"Create"**

### Step 6: Copy Your Credentials

After creating the OAuth client, you'll see a popup with:
- **Your Client ID** (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
- **Your Client Secret** (looks like: `GOCSPX-abcdefghijklmnopqrstuvwxyz`)

**Important**: Copy both of these immediately - you won't be able to see the Client Secret again!

### Step 7: Add Credentials to Your .env.local File

1. Open your `.env.local` file (create it from `.env.local.example` if needed)
2. Add your credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3003/api/auth/google/callback
   ```

### Step 8: Get Your Refresh Token

To get the refresh token, you need to authorize the application:

1. **Option A: Using the API endpoint** (Recommended)
   - Start your development server: `npm run dev`
   - Visit: `http://localhost:3003/api/auth/google`
   - This will return a JSON with an `authUrl`
   - Copy the `authUrl` and open it in your browser
   - Sign in and authorize the application
   - You'll be redirected to the callback URL
   - The callback will return a JSON with your `refresh_token`
   - Copy the `refresh_token` and add it to `.env.local`:
     ```
     GOOGLE_REFRESH_TOKEN=your_refresh_token_here
     ```

2. **Option B: Using OAuth 2.0 Playground** (Alternative)
   - Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Click the gear icon (⚙️) in the top right
   - Check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - In the left panel, find "Drive API v3"
   - Select the scopes:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/drive.metadata.readonly`
   - Click "Authorize APIs"
   - Sign in and authorize
   - Click "Exchange authorization code for tokens"
   - Copy the "Refresh token" value

### Step 9: Get Your Google Drive Folder ID

1. Open Google Drive in your browser
2. Navigate to the folder you want to use as your root folder
3. Open the folder
4. Look at the URL - it will look like:
   `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`
5. The folder ID is the part after `/folders/` (e.g., `1a2b3c4d5e6f7g8h9i0j`)
6. Add it to `.env.local`:
   ```
   GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
   ```

## Security Best Practices

1. **Never commit `.env.local` to Git** - it's already in `.gitignore`
2. **Never expose your Client Secret** in client-side code
3. **Keep your Refresh Token secure** - treat it like a password
4. **For production (Vercel)**, add all environment variables in Vercel's project settings, not in code

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the redirect URI in your OAuth client matches exactly what's in your `.env.local`
- For Vercel, use your production URL: `https://your-app.vercel.app/api/auth/google/callback`

### "Access denied" or "Invalid grant"
- Your refresh token may have expired
- Try getting a new refresh token using the steps above

### "API not enabled" error
- Make sure Google Drive API is enabled in your Google Cloud project
- Go to APIs & Services > Library and verify it's enabled

## Quick Reference

- **Google Cloud Console**: https://console.cloud.google.com/
- **OAuth 2.0 Playground**: https://developers.google.com/oauthplayground/
- **Google Drive API Docs**: https://developers.google.com/drive/api





