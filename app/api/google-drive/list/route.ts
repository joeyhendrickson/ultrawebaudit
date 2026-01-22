import { NextRequest, NextResponse } from 'next/server';
import { listFilesInFolder } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const folderId =
      request.nextUrl.searchParams.get('folderId') ||
      process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    // List files in the folder
    const files = await listFilesInFolder(folderId);

    return NextResponse.json({
      success: true,
      files: files.map((file) => ({
        fileId: file.id,
        id: file.id, // Keep for backwards compatibility
        name: file.name,
        title: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
      })),
      totalFiles: files.length,
    });
  } catch (error) {
    console.error('Google Drive list error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to list Google Drive files',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
