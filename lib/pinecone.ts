import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export async function getPineconeClient(): Promise<Pinecone> {
  if (pineconeClient) {
    return pineconeClient;
  }

  const apiKey = process.env.PINECONE_API_KEY;

  if (!apiKey) {
    throw new Error('Pinecone API key must be set (PINECONE_API_KEY)');
  }

  // Pinecone v2 (serverless) only needs the API key, environment is not required
  pineconeClient = new Pinecone({
    apiKey: apiKey,
  });

  return pineconeClient;
}

export async function queryPinecone(
  queryVector: number[],
  topK: number = 5,
  namespace?: string
) {
  const client = await getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME || 'ultra-index';
  const index = client.index(indexName);

  if (namespace) {
    const queryResponse = await index.namespace(namespace).query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });
    return queryResponse.matches || [];
  } else {
    const queryResponse = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
    });
    return queryResponse.matches || [];
  }
}

export async function queryPineconeByFileId(
  fileId: string,
  namespace?: string
) {
  const client = await getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME || 'ultra-index';
  const index = client.index(indexName);

  // Use a dummy vector for the query (we're filtering by metadata)
  // We need a vector of the right dimension (1536 for OpenAI embeddings)
  const dummyVector = new Array(1536).fill(0);

  try {
    let queryResponse;
    // Try with filter first
    try {
      if (namespace) {
        queryResponse = await index.namespace(namespace).query({
          vector: dummyVector,
          topK: 10000,
          includeMetadata: true,
          filter: {
            fileId: { $eq: fileId },
          },
        });
      } else {
        queryResponse = await index.query({
          vector: dummyVector,
          topK: 10000,
          includeMetadata: true,
          filter: {
            fileId: { $eq: fileId },
          },
        });
      }
      return queryResponse.matches || [];
    } catch (filterError) {
      // If filter fails, query without filter and filter in code
      console.warn('Filter query failed, falling back to code-based filtering:', filterError);
      if (namespace) {
        queryResponse = await index.namespace(namespace).query({
          vector: dummyVector,
          topK: 10000,
          includeMetadata: true,
        });
      } else {
        queryResponse = await index.query({
          vector: dummyVector,
          topK: 10000,
          includeMetadata: true,
        });
      }
      
      // Filter matches by fileId in metadata
      const filteredMatches = (queryResponse.matches || []).filter(match => {
        const matchFileId = match.metadata?.fileId || match.metadata?.file_id;
        return matchFileId === fileId;
      });
      
      return filteredMatches;
    }
  } catch (error) {
    console.error('Error querying Pinecone by fileId:', error);
    // Final fallback: try with embedding query
    try {
      const { getEmbedding } = await import('./openai');
      const queryEmbedding = await getEmbedding(fileId);
      const matches = await queryPinecone(queryEmbedding, 10000, namespace);
      // Filter by fileId
      return matches.filter(match => {
        const matchFileId = match.metadata?.fileId || match.metadata?.file_id;
        return matchFileId === fileId;
      });
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      return [];
    }
  }
}

export async function upsertToPinecone(
  vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, any>;
  }>,
  namespace?: string
) {
  const client = await getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME || 'ultra-index';
  const index = client.index(indexName);

  console.log(`Upserting ${vectors.length} vector(s) to Pinecone index: ${indexName}`);
  if (namespace) {
    console.log(`Using namespace: ${namespace}`);
  }
  console.log(`Vector IDs: ${vectors.map(v => v.id).join(', ')}`);
  console.log(`Vector dimensions: ${vectors[0]?.values.length || 'N/A'}`);
  
  try {
    // Use namespace if provided
    if (namespace) {
      const result = await index.namespace(namespace).upsert(vectors);
      console.log(`Successfully upserted ${vectors.length} vector(s) to Pinecone namespace: ${namespace}`);
      return result;
    } else {
      const result = await index.upsert(vectors);
      console.log(`Successfully upserted ${vectors.length} vector(s) to Pinecone (default namespace)`);
      return result;
    }
  } catch (error) {
    console.error('Pinecone upsert error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to upsert to Pinecone: ${errorMessage}`);
  }
}

