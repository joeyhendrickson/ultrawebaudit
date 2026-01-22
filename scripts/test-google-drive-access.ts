import { config } from 'dotenv';
import { resolve } from 'path';
import { listFilesInFolder, getGoogleDriveClient } from '../lib/google-drive';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testGoogleDriveAccess() {
  console.log('🔍 Testing Google Drive Access...\n');

  // Check environment variables
  console.log('📋 Checking Environment Variables:');
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_DRIVE_FOLDER_ID',
  ];

  const missingVars: string[] = [];
  requiredVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value || value.includes('YOUR_') || value.trim() === '') {
      console.log(`   ❌ ${varName}: Missing or not set`);
      missingVars.push(varName);
    } else {
      const displayValue = varName.includes('SECRET') || varName.includes('TOKEN')
        ? `${value.substring(0, 10)}...` 
        : value;
      console.log(`   ✅ ${varName}: ${displayValue}`);
    }
  });

  if (missingVars.length > 0) {
    console.log('\n❌ Missing required environment variables. Please set them in .env.local');
    process.exit(1);
  }

  console.log('\n🔐 Testing OAuth Authentication...');
  try {
    const drive = await getGoogleDriveClient();
    console.log('   ✅ Successfully authenticated with Google Drive API');
  } catch (error) {
    console.error('   ❌ Authentication failed:', error instanceof Error ? error.message : error);
    console.error('\n💡 This usually means:');
    console.error('   - Your refresh token is invalid or expired');
    console.error('   - You need to re-authorize the application');
    console.error('   - Run: npm run get-token to get a new refresh token');
    process.exit(1);
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  console.log(`\n📁 Listing files in folder: ${folderId}`);

  try {
    const files = await listFilesInFolder(folderId);
    
    if (files.length === 0) {
      console.log('   ⚠️  No files found in the folder');
      console.log('\n💡 Possible reasons:');
      console.log('   - The folder is empty');
      console.log('   - The folder ID is incorrect');
      console.log('   - You don\'t have access to this folder');
      console.log('   - Files are in a subfolder');
    } else {
      console.log(`   ✅ Found ${files.length} file(s):\n`);
      files.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name} (${file.mimeType || 'unknown type'})`);
        console.log(`      ID: ${file.id}`);
        if (file.modifiedTime) {
          console.log(`      Modified: ${file.modifiedTime}`);
        }
        console.log('');
      });
    }

    console.log('\n✅ Google Drive access test completed successfully!');
    console.log('\n💡 If files are not appearing in Vector DB Browser:');
    console.log('   1. Make sure files have been vectorized (run: npm run vectorize)');
    console.log('   2. Check that files are in the correct folder');
    console.log('   3. Verify the folder ID matches GOOGLE_DRIVE_FOLDER_ID');
    
  } catch (error) {
    console.error('\n❌ Error listing files:', error instanceof Error ? error.message : error);
    
    if (error instanceof Error) {
      if (error.message.includes('refresh token')) {
        console.error('\n💡 Your refresh token may be invalid. Try:');
        console.error('   1. Visit: http://localhost:3003/api/auth/google');
        console.error('   2. Authorize the application again');
        console.error('   3. Get the new refresh token from the callback');
      } else if (error.message.includes('403') || error.message.includes('permission')) {
        console.error('\n💡 Permission error. Try:');
        console.error('   1. Re-authorize with broader permissions');
        console.error('   2. Make sure you\'re using the account that owns/has access to the files');
        console.error('   3. Check file sharing settings in Google Drive');
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        console.error('\n💡 Folder not found. Check:');
        console.error('   1. The GOOGLE_DRIVE_FOLDER_ID is correct');
        console.error('   2. You have access to the folder');
        console.error('   3. The folder exists in Google Drive');
      }
    }
    
    process.exit(1);
  }
}

testGoogleDriveAccess().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
