import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google OAuth credentials not configured', details: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables' },
        { status: 500 }
      );
    }

    if (clientId.includes('YOUR_CLIENT_ID') || clientSecret.includes('YOUR_CLIENT_SECRET')) {
      return NextResponse.json(
        { error: 'Google OAuth credentials not configured', details: 'Please replace placeholder values in .env.local with your actual Google OAuth credentials' },
        { status: 500 }
      );
    }

    const oauth2Client = getGoogleOAuthClient();
    
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly', // Read all files (needed to list folder contents)
      'https://www.googleapis.com/auth/drive.file', // Create/edit/delete files the app creates (for uploads)
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
