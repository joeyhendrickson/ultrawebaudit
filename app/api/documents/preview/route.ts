import { NextRequest, NextResponse } from 'next/server';
import { queryPineconeByFileId } from '@/lib/pinecone';

export async function POST(request: NextRequest) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Query Pinecone for all chunks of a specific file using metadata filter
    const matches = await queryPineconeByFileId(fileId);
    
    // Filter matches by fileId (in case filter didn't work, fallback)
    const filteredMatches = matches.filter(match => {
      const matchFileId = match.metadata?.fileId || match.metadata?.file_id;
      return matchFileId === fileId;
    });

    if (filteredMatches.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No content found for this document. It may not be fully indexed in the vector database.',
        chunks: [],
        fileId,
        chunkCount: 0,
      });
    }

    // Sort matches by chunkIndex to reconstruct the document order
    filteredMatches.sort((a, b) => {
      const aIndex = Number(a.metadata?.chunkIndex || a.metadata?.chunk_index || 0) || 0;
      const bIndex = Number(b.metadata?.chunkIndex || b.metadata?.chunk_index || 0) || 0;
      return aIndex - bIndex;
    });

    // Return chunks individually with metadata
    const chunks = filteredMatches.map((match, index) => ({
      id: match.id,
      chunkIndex: Number(match.metadata?.chunkIndex || match.metadata?.chunk_index || index),
      text: match.metadata?.text || match.metadata?.content || '',
      score: match.score || 0,
      title: match.metadata?.title || 'Untitled',
    }));

    return NextResponse.json({
      success: true,
      chunks,
      fileId,
      chunkCount: chunks.length,
    });
  } catch (error) {
    console.error('Document preview API error:', error);
    return NextResponse.json(
      { error: 'Failed to get document preview' },
      { status: 500 }
    );
  }
}
