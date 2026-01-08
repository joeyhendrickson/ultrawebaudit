import { config } from 'dotenv';
import { resolve } from 'path';
import { getOpenAIClient } from '../lib/openai';
import { writeFile, unlink } from 'fs/promises';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testWhisperAccess() {
  try {
    const client = getOpenAIClient();
    
    // Create a small test audio file (silence)
    // For a real test, you'd need an actual audio file
    const testAudioBuffer = Buffer.from('test'); // This won't work, but will test the API endpoint
    
    console.log('🧪 Testing Whisper API access...\n');
    
    try {
      // Try to create a transcription request
      // Note: This will likely fail because we're not sending valid audio,
      // but it will tell us if the API endpoint is accessible
      const audioFile = new File([testAudioBuffer], 'test.mp3', { type: 'audio/mpeg' });
      
      const response = await client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      });
      
      console.log('✅ Whisper API is accessible!');
    } catch (error: any) {
      if (error.status === 403) {
        console.log('❌ Whisper API access denied (403)');
        console.log('\n📋 This means your OpenAI project/account does not have access to Whisper API.');
        console.log('\n💡 To enable Whisper API access:');
        console.log('   1. Check your OpenAI account billing status');
        console.log('   2. Verify your subscription plan includes Whisper API');
        console.log('   3. Contact OpenAI support: https://help.openai.com/');
        console.log('   4. Check if your organization/project has model restrictions');
      } else if (error.status === 401) {
        console.log('❌ Authentication failed - check your OPENAI_API_KEY');
      } else if (error.message?.includes('Invalid audio format')) {
        console.log('✅ Whisper API endpoint is accessible! (The error is expected - we used invalid test data)');
      } else {
        console.log('⚠️  Error:', error.message || error);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  }
}

testWhisperAccess();



