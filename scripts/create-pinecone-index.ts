import { config } from 'dotenv';
import { resolve } from 'path';
import { Pinecone } from '@pinecone-database/pinecone';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function createIndex() {
  try {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX_NAME || 'ultra-index';

    if (!apiKey) {
      console.error('❌ PINECONE_API_KEY is not set in .env.local');
      process.exit(1);
    }

    console.log(`🔍 Checking Pinecone index: ${indexName}`);
    
    const pinecone = new Pinecone({ apiKey });
    
    // List all indexes
    const indexes = await pinecone.listIndexes();
    const existingIndex = indexes.indexes?.find(idx => idx.name === indexName);

    if (existingIndex) {
      console.log(`✅ Index "${indexName}" already exists!`);
      console.log(`   Dimensions: ${existingIndex.dimension || 'Unknown'}`);
      console.log(`   Metric: ${existingIndex.metric || 'Unknown'}`);
      return;
    }

    console.log(`\n📦 Creating new index: ${indexName}`);
    console.log('   Dimensions: 1536 (OpenAI text-embedding-3-small)');
    console.log('   Metric: cosine');
    console.log('   This may take a few minutes...\n');

    await pinecone.createIndex({
      name: indexName,
      dimension: 1536,
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1', // You can change this to your preferred region
        },
      },
    });

    console.log(`✅ Index "${indexName}" created successfully!`);
    console.log('\n⏳ Waiting for index to be ready (this may take a minute)...');
    
    // Wait for index to be ready
    let ready = false;
    let attempts = 0;
    while (!ready && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const indexes = await pinecone.listIndexes();
      const index = indexes.indexes?.find(idx => idx.name === indexName);
      
      if (index) {
        console.log(`   ✓ Index status: ${index.status || 'checking...'}`);
        if (index.status === 'Ready') {
          ready = true;
        }
      }
      attempts++;
    }

    if (ready) {
      console.log('\n✅ Index is ready! You can now run: npm run vectorize');
    } else {
      console.log('\n⚠️  Index is still initializing. Please wait a few minutes and try running vectorize again.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

createIndex();





