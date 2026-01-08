import { config } from 'dotenv';
import { resolve } from 'path';
import OpenAI from 'openai';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testModelAccess() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY is not set in .env.local');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  // Models to test
  const modelsToTest = [
    'gpt-5.2',
    'gpt-5.2-thinking',
    'gpt-5.2-instant',
    'gpt-5.2-pro',
    'gpt-5.1',
    'gpt-5.1-thinking',
    'gpt-5.1-instant',
    'gpt-5.1-pro',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4o-mini',
  ];

  console.log('🧪 Testing model access...\n');

  for (const model of modelsToTest) {
    try {
      console.log(`Testing ${model}...`);
      const response = await client.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });
      console.log(`✅ ${model} - ACCESSIBLE\n`);
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`❌ ${model} - NOT FOUND (model doesn't exist)\n`);
      } else if (error.status === 403) {
        console.log(`🚫 ${model} - NO ACCESS (403 - project doesn't have access)\n`);
      } else {
        console.log(`⚠️  ${model} - ERROR: ${error.message}\n`);
      }
    }
  }
}

testModelAccess().catch(console.error);

