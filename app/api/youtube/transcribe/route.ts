import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import { uploadFileToGoogleDrive } from '@/lib/google-drive';
import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

// Extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// Get video info from YouTube (using oEmbed API)
async function getVideoInfo(videoId: string): Promise<{ title: string }> {
  try {
    const response = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      timeout: 10000,
    });
    return {
      title: response.data.title || 'Untitled Video',
    };
  } catch (error) {
    console.warn('Could not fetch video title:', error);
    return { title: 'Untitled Video' };
  }
}

// Download audio using yt-dlp (if available) or fallback method
async function downloadAudio(videoUrl: string, outputDir: string, videoId: string): Promise<string> {
  try {
    const outputTemplate = join(outputDir, `${videoId}.%(ext)s`);
    
    // Try yt-dlp first (most reliable)
    try {
      await execAsync(`yt-dlp -x --audio-format mp3 -o "${outputTemplate}" "${videoUrl}"`);
      // Find the created file
      const files = await import('fs/promises').then(fs => fs.readdir(outputDir));
      const audioFile = files.find(f => f.startsWith(videoId) && (f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.webm')));
      if (audioFile) {
        return join(outputDir, audioFile);
      }
      throw new Error('Audio file not found after download');
    } catch (ytdlpError) {
      console.warn('yt-dlp not available, trying alternative methods...');
      
      // Fallback: Try youtube-dl
      try {
        await execAsync(`youtube-dl -x --audio-format mp3 -o "${outputTemplate}" "${videoUrl}"`);
        const files = await import('fs/promises').then(fs => fs.readdir(outputDir));
        const audioFile = files.find(f => f.startsWith(videoId) && (f.endsWith('.mp3') || f.endsWith('.m4a') || f.endsWith('.webm')));
        if (audioFile) {
          return join(outputDir, audioFile);
        }
        throw new Error('Audio file not found after download');
      } catch (youtubeDlError) {
        throw new Error('Neither yt-dlp nor youtube-dl is installed. Please install yt-dlp: brew install yt-dlp (Mac) or apt-get install yt-dlp (Linux)');
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to download audio: ${errorMessage}`);
  }
}

// Transcribe audio using OpenAI Whisper API
async function transcribeAudio(audioPath: string): Promise<string> {
  const openai = getOpenAIClient();
  
  try {
    // Read the audio file as a buffer
    const audioBuffer = await readFile(audioPath);
    
    // Create a File-like object for OpenAI API
    // In Node.js, we need to create a File object manually or use the buffer directly
    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });
    
    // Use environment variable for model, or default to whisper-1
    const whisperModel = process.env.OPENAI_WHISPER_MODEL || 'whisper-1';
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: whisperModel,
      language: 'en', // Optional: specify language
    });
    
    return transcription.text;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide more helpful error messages
    if (errorMessage.includes('403') || errorMessage.includes('does not have access')) {
      throw new Error(`Your OpenAI project does not have access to the Whisper API. Please check your OpenAI account settings and ensure Whisper API access is enabled. Error: ${errorMessage}`);
    }
    
    throw new Error(`Failed to transcribe audio: ${errorMessage}`);
  }
}

export async function POST(request: NextRequest) {
  let tempAudioPath: string | null = null;
  
  try {
    const { url, autoUpload = true } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Get video info
    const videoInfo = await getVideoInfo(videoId);
    
    // Download audio
    const tempDir = tmpdir();
    const uniqueId = `${videoId}_${Date.now()}`;
    
    console.log(`Downloading audio for video: ${videoId}`);
    tempAudioPath = await downloadAudio(url, tempDir, uniqueId);
    
    // Transcribe audio
    console.log(`Transcribing audio: ${tempAudioPath}`);
    const transcript = await transcribeAudio(tempAudioPath);
    
    // Clean up audio file
    try {
      await unlink(tempAudioPath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup audio file:', cleanupError);
    }

    // Upload to Google Drive if requested
    let fileId: string | undefined;
    if (autoUpload && transcript) {
      const fileName = `${videoInfo.title.replace(/[^a-z0-9]/gi, '_')}_${videoId}_transcript.txt`;
      const uploadResult = await uploadFileToGoogleDrive(
        fileName,
        transcript,
        'text/plain'
      );
      fileId = uploadResult.fileId;
    }

    return NextResponse.json({
      success: true,
      videoId,
      title: videoInfo.title,
      transcript,
      fileId,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up on error
    if (tempAudioPath) {
      try {
        await unlink(tempAudioPath).catch(() => {});
      } catch {}
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide helpful error messages
    if (errorMessage.includes('yt-dlp') || errorMessage.includes('youtube-dl')) {
      return NextResponse.json(
        { 
          error: 'Audio extraction tool not found',
          details: 'Please install yt-dlp: brew install yt-dlp (Mac) or apt-get install yt-dlp (Linux). Alternatively, deploy to a server with yt-dlp installed.',
          help: 'For Vercel deployment, you may need to use a different approach or install yt-dlp in a custom Docker image.'
        },
        { status: 500 }
      );
    }
    
    if (errorMessage.includes('does not have access') || errorMessage.includes('Whisper') || errorMessage.includes('403')) {
      return NextResponse.json(
        { 
          error: 'Whisper API access denied',
          details: errorMessage,
          help: `Your OpenAI project does not have access to the Whisper API. 

To enable Whisper API access:
1. Go to https://platform.openai.com/
2. Check your account settings and API access
3. Ensure your subscription/plan includes Whisper API access
4. Contact OpenAI support if Whisper is not available for your account type

Alternatively, you can:
- Use a different OpenAI API key that has Whisper access
- Wait for OpenAI to grant Whisper access to your project

Note: Whisper API access may require specific subscription tiers or account verification.`
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

