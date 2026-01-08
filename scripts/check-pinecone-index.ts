import { config } from 'dotenv';
import { resolve } from 'path';
import { Pinecone } from '@pinecone-database/pinecone';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function checkIndex() {
  try {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX_NAME || 'ultra-index';

    if (!apiKey) {
      console.error('❌ PINECONE_API_KEY is not set in .env.local');
      process.exit(1);
    }

    console.log(`🔍 Checking Pinecone index: ${indexName}\n`);
    
    const pinecone = new Pinecone({ apiKey });
    
    // List all indexes
    console.log('📋 Listing all available indexes...\n');
    const indexes = await pinecone.listIndexes();
    
    if (!indexes.indexes || indexes.indexes.length === 0) {
      console.log('❌ No indexes found in your Pinecone account.');
      return;
    }

    console.log(`Found ${indexes.indexes.length} index(es):\n`);
    indexes.indexes.forEach((idx, i) => {
      const isMatch = idx.name === indexName;
      console.log(`${isMatch ? '✅' : '  '} ${i + 1}. ${idx.name}`);
      console.log(`     Dimensions: ${idx.dimension || 'Unknown'}`);
      console.log(`     Metric: ${idx.metric || 'Unknown'}`);
      console.log(`     Status: ${idx.status || 'Unknown'}`);
      if (isMatch) {
        console.log(`     ⭐ This matches your PINECONE_INDEX_NAME`);
      }
      console.log('');
    });

    const existingIndex = indexes.indexes.find(idx => idx.name === indexName);

    if (!existingIndex) {
      console.log(`\n❌ Index "${indexName}" not found!`);
      console.log(`\n📝 Make sure:`);
      console.log(`   1. The index name in Pinecone dashboard matches "${indexName}"`);
      console.log(`   2. Or update PINECONE_INDEX_NAME in .env.local to match an existing index`);
      return;
    }

    if (existingIndex.dimension !== 1536) {
      console.log(`\n⚠️  Warning: Index has ${existingIndex.dimension} dimensions, but we're creating 1536-dimension embeddings.`);
      console.log(`   You need to recreate the index with 1536 dimensions.`);
    } else {
      console.log(`\n✅ Index found and dimensions match (1536)`);
    }

    const status = existingIndex.status?.toString() || String(existingIndex.status);
    if (status !== 'Ready') {
      console.log(`\n⚠️  Index status: ${status}`);
      console.log(`   Wait for the index to be "Ready" before vectorizing.`);
    } else {
      console.log(`\n✅ Index is ready!`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

checkIndex();





