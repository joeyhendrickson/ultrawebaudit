import { config } from 'dotenv';
import { resolve } from 'path';
import { getGoogleOAuthClient } from '../lib/google-drive';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function getRefreshToken() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('❌ Missing required environment variables:');
      console.error('   GOOGLE_CLIENT_ID:', clientId ? '✅' : '❌');
      console.error('   GOOGLE_CLIENT_SECRET:', clientSecret ? '✅' : '❌');
      console.error('   GOOGLE_REDIRECT_URI:', redirectUri ? '✅' : '❌');
      process.exit(1);
    }

    const oauth2Client = getGoogleOAuthClient();

    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly', // Read all files (needed to list folder contents)
      'https://www.googleapis.com/auth/drive.file', // Create/edit/delete files the app creates (for uploads)
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
    });

    console.log('\n🔐 Google OAuth Authorization');
    console.log('='.repeat(60));
    console.log('\n1. Open this URL in your browser:');
    console.log('\n   ' + authUrl);
    console.log('\n2. Sign in with the Google account that has access to your files');
    console.log('3. Grant all requested permissions');
    console.log('4. After authorization, you will be redirected to:');
    console.log('   ' + redirectUri);
    console.log('\n5. Copy the "code" parameter from the redirect URL');
    console.log('6. Run this command with the code:');
    console.log('   npm run authorize --code=YOUR_CODE_HERE\n');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getRefreshToken();





