import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion, getEmbedding } from '@/lib/openai';
import { queryPinecone } from '@/lib/pinecone';

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get embedding for the user's message
    const queryEmbedding = await getEmbedding(message);

    // Query Pinecone for relevant context (with error handling)
    let matches: any[] = [];
    try {
      matches = await queryPinecone(queryEmbedding, 5);
    } catch (pineconeError) {
      console.warn('Pinecone query failed, continuing without context:', pineconeError);
      // Continue without context if Pinecone fails
      matches = [];
    }

    // Calculate a simple confidence score based on the highest match score
    const confidenceScore = matches.length > 0 ? matches[0].score || 0 : 0;

    // Build context from Pinecone results and extract sources
    const context = matches
      .map((match) => {
        const metadata = match.metadata || {};
        return `[${metadata.title || 'Document'}]: ${metadata.text || match.id}`;
      })
      .join('\n\n');

    const sources = matches.map((match) => ({
      id: match.id,
      title: match.metadata?.title || 'Untitled Document',
      text: match.metadata?.text || '',
      score: match.score || 0,
      fileId: match.metadata?.fileId || '',
      chunkIndex: match.metadata?.chunkIndex || 0,
    }));

    // Prepare chat history
    const messages = history.map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Add current message
    messages.push({
      role: 'user',
      content: message,
    });

    // Get response from OpenAI with context
    let response = await chatCompletion(messages, context);

    // Remove markdown formatting to make it more conversational and human
    // Remove headers (###, ##, #)
    response = response.replace(/^#{1,6}\s+/gm, '');
    // Remove bold/italic markdown (**text**, *text*, __text__, _text_)
    response = response.replace(/\*\*([^*]+)\*\*/g, '$1');
    response = response.replace(/\*([^*]+)\*/g, '$1');
    response = response.replace(/__([^_]+)__/g, '$1');
    response = response.replace(/_([^_]+)_/g, '$1');
    // Remove code blocks (```code``` and `code`)
    response = response.replace(/```[\s\S]*?```/g, '');
    response = response.replace(/`([^`]+)`/g, '$1');
    // Remove links ([text](url))
    response = response.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Remove list markers (-, *, +, 1.)
    response = response.replace(/^[\s]*[-*+]\s+/gm, '');
    response = response.replace(/^\d+\.\s+/gm, '');
    // Clean up extra whitespace
    response = response.replace(/\n{3,}/g, '\n\n');
    response = response.trim();

    return NextResponse.json({
      response,
      contextUsed: matches.length > 0,
      sources,
      confidenceScore,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to process chat message';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }
    
    // Check for common issues
    if (errorMessage.includes('API key') || errorMessage.includes('must be set')) {
      errorMessage = 'Configuration error: Missing API keys. Please check your environment variables (OPENAI_API_KEY is required, PINECONE_API_KEY is optional but recommended).';
    } else if (errorMessage.includes('Pinecone')) {
      errorMessage = `Pinecone error: ${errorMessage}`;
    } else if (errorMessage.includes('OpenAI')) {
      errorMessage = `OpenAI error: ${errorMessage}`;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
