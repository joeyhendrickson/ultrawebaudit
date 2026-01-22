import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';

let oauth2Client: OAuth2Client | null = null;

export function getGoogleOAuthClient(): OAuth2Client {
  if (oauth2Client) {
    return oauth2Client;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials must be set');
  }

  oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

  // Set refresh token if available
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (refreshToken) {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
  }

  return oauth2Client;
}

export async function getGoogleDriveClient() {
  const auth = getGoogleOAuthClient();
  
  // Refresh access token if needed
  try {
    const { credentials } = await auth.refreshAccessToken();
    auth.setCredentials(credentials);
    
    // Check if Google provided a new refresh token
    // This can happen when the token is rotated or re-issued
    if (credentials.refresh_token && credentials.refresh_token !== process.env.GOOGLE_REFRESH_TOKEN) {
      console.warn('⚠️  Google provided a NEW refresh token. Update your GOOGLE_REFRESH_TOKEN in .env.local:');
      console.warn(`   New token: ${credentials.refresh_token}`);
      console.warn('   This helps prevent token expiration. Update your environment variables.');
    }
  } catch (error) {
    console.error('Error refreshing access token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide helpful error messages
    if (errorMessage.includes('invalid_grant')) {
      throw new Error(
        `Refresh token expired or revoked. This usually happens if:\n` +
        `- Your app is in "Testing" mode (tokens expire after 7 days)\n` +
        `- Token hasn't been used for 6 months\n` +
        `- User revoked access\n\n` +
        `Solution: Get a new refresh token by visiting:\n` +
        `http://localhost:3003/api/auth/google\n\n` +
        `See PREVENT_TOKEN_EXPIRATION.md for more details.`
      );
    }
    
    throw new Error(`Failed to refresh access token: ${errorMessage}. Make sure your refresh token is valid.`);
  }

  return google.drive({ version: 'v3', auth });
}

export async function listFilesInFolder(folderId: string) {
  const drive = await getGoogleDriveClient();
  
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, modifiedTime, exportLinks)',
  });

  return response.data.files || [];
}

export async function exportGoogleDoc(fileId: string, mimeType: string): Promise<Buffer> {
  const drive = await getGoogleDriveClient();
  
  // Google Docs/Sheets/Slides need to be exported
  let exportMimeType = 'text/plain';
  
  if (mimeType === 'application/vnd.google-apps.document') {
    exportMimeType = 'text/plain'; // or 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' for DOCX
  } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    exportMimeType = 'text/csv';
  } else if (mimeType === 'application/vnd.google-apps.presentation') {
    exportMimeType = 'text/plain';
  }
  
  try {
    const response = await drive.files.export(
      { fileId, mimeType: exportMimeType },
      { responseType: 'arraybuffer' }
    );
    
    return Buffer.from(response.data as ArrayBuffer);
  } catch (error) {
    console.error(`Error exporting Google Doc ${fileId}:`, error);
    throw error;
  }
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = await getGoogleDriveClient();
  
  try {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data as ArrayBuffer);
  } catch (error: any) {
    if (error.code === 403 || error.message?.includes('not granted')) {
      throw new Error(`The user has not granted the app read access to the file ${fileId}. You may need to re-authorize with broader permissions or ensure the files are accessible.`);
    }
    throw error;
  }
}

export async function getFileContent(fileId: string, mimeType?: string): Promise<Buffer> {
  const drive = await getGoogleDriveClient();
  
  // Check if this is a Google Workspace file (Docs, Sheets, Slides)
  if (mimeType && mimeType.includes('vnd.google-apps')) {
    // Google Workspace files need to be exported
    return await exportGoogleDoc(fileId, mimeType);
  }
  
  // Regular files can be downloaded directly
  const buffer = await downloadFile(fileId);
  return buffer;
}

export async function uploadFileToGoogleDrive(
  fileName: string,
  fileContent: Buffer | string,
  mimeType: string = 'text/plain',
  folderId?: string
): Promise<{ fileId: string; webViewLink?: string }> {
  const drive = await getGoogleDriveClient();
  
  const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
  
  if (!targetFolderId) {
    throw new Error('Google Drive folder ID is required. Set GOOGLE_DRIVE_FOLDER_ID in environment variables.');
  }

  // Convert string to Buffer if needed
  const buffer = typeof fileContent === 'string' ? Buffer.from(fileContent, 'utf-8') : fileContent;

  try {
    const fileMetadata = {
      name: fileName,
      parents: [targetFolderId],
    };

    // Convert Buffer to a Readable stream for the Google Drive API
    const stream = Readable.from(buffer);

    const media = {
      mimeType,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    return {
      fileId: response.data.id || '',
      webViewLink: response.data.webViewLink || undefined,
    };
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to upload file to Google Drive: ${errorMessage}`);
  }
}

