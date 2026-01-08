import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { listFilesInFolder, getFileContent } from '../lib/google-drive';
import { extractTextFromDocument } from '../lib/document-processor';
import { getEmbedding } from '../lib/openai';
import { upsertToPinecone } from '../lib/pinecone';

async function vectorizeDriveFiles() {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    if (!folderId) {
      console.error('❌ GOOGLE_DRIVE_FOLDER_ID is not set in .env.local');
      process.exit(1);
    }

    console.log('📁 Fetching files from Google Drive folder:', folderId);
    const files = await listFilesInFolder(folderId);
    console.log(`✅ Found ${files.length} file(s)\n`);

    if (files.length === 0) {
      console.log('No files found in the folder.');
      return;
    }

    const processedFiles: Array<{ name: string; chunks: number; error?: string }> = [];
    let totalChunks = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n[${i + 1}/${files.length}] Processing: ${file.name}`);
      console.log(`   MIME Type: ${file.mimeType}`);
      console.log(`   File ID: ${file.id}`);

      try {
        // Download file
        console.log('   📥 Downloading file...');
        const buffer = await getFileContent(file.id!, file.mimeType);
        console.log(`   ✅ Downloaded ${buffer.length} bytes`);

        if (buffer.length === 0) {
          console.log('   ⚠️  File is empty, skipping');
          processedFiles.push({ name: file.name || 'Unknown', chunks: 0, error: 'Empty file' });
          continue;
        }

        // Extract text
        console.log('   📄 Extracting text...');
        const text = await extractTextFromDocument(buffer, file.mimeType || 'text/plain');
        console.log(`   ✅ Extracted ${text.length} characters`);

        if (!text || text.trim().length === 0) {
          console.log('   ⚠️  No text extracted, skipping');
          processedFiles.push({ name: file.name || 'Unknown', chunks: 0, error: 'No text extracted' });
          continue;
        }

        // Chunk the text
        console.log('   ✂️  Chunking text...');
        let chunks: string[] = [];
        
        // Maximum chunk size: 2000 characters (≈ 500 tokens, well under 8192 token limit)
        const MAX_CHUNK_SIZE = 2000;
        const OVERLAP = 200;
        
        // Try paragraph-based chunking
        const paragraphChunks = text.split(/\n\n+/).filter((chunk) => chunk.trim().length > 20);
        if (paragraphChunks.length > 0) {
          // Split large paragraphs into smaller chunks
          for (const para of paragraphChunks) {
            if (para.length <= MAX_CHUNK_SIZE) {
              chunks.push(para);
            } else {
              // Split large paragraph into smaller chunks
              for (let i = 0; i < para.length; i += MAX_CHUNK_SIZE - OVERLAP) {
                const chunk = para.slice(i, i + MAX_CHUNK_SIZE).trim();
                if (chunk.length > 20) {
                  chunks.push(chunk);
                }
              }
            }
          }
        } else {
          // Fall back to sentence-based
          const sentenceChunks = text.split(/[.!?]+\s+/).filter((chunk) => chunk.trim().length > 20);
          if (sentenceChunks.length > 0) {
            // Split large sentences into smaller chunks
            for (const sent of sentenceChunks) {
              if (sent.length <= MAX_CHUNK_SIZE) {
                chunks.push(sent);
              } else {
                // Split large sentence into smaller chunks
                for (let i = 0; i < sent.length; i += MAX_CHUNK_SIZE - OVERLAP) {
                  const chunk = sent.slice(i, i + MAX_CHUNK_SIZE).trim();
                  if (chunk.length > 20) {
                    chunks.push(chunk);
                  }
                }
              }
            }
          } else {
            // Fall back to fixed-size
            for (let j = 0; j < text.length; j += MAX_CHUNK_SIZE - OVERLAP) {
              const chunk = text.slice(j, j + MAX_CHUNK_SIZE).trim();
              if (chunk.length > 20) {
                chunks.push(chunk);
              }
            }
          }
        }

        console.log(`   ✅ Created ${chunks.length} chunks`);

        if (chunks.length === 0) {
          console.log('   ⚠️  No valid chunks created, skipping');
          processedFiles.push({ name: file.name || 'Unknown', chunks: 0, error: 'No valid chunks' });
          continue;
        }

        // Create embeddings and upload to Pinecone
        console.log('   🧠 Creating embeddings and uploading to Pinecone...');
        let successfulChunks = 0;

        for (let j = 0; j < chunks.length; j++) {
          try {
            const chunk = chunks[j];
            const embedding = await getEmbedding(chunk);
            
            await upsertToPinecone([
              {
                id: `${file.id}_chunk_${j}`,
                values: embedding,
                metadata: {
                  title: file.name || 'Untitled',
                  text: chunk,
                  fileId: file.id,
                  chunkIndex: j,
                  mimeType: file.mimeType,
                  modifiedTime: file.modifiedTime,
                },
              },
            ]);
            
            successfulChunks++;
            if ((j + 1) % 10 === 0) {
              console.log(`      Uploaded ${j + 1}/${chunks.length} chunks...`);
            }
          } catch (chunkError) {
            console.error(`      ❌ Error processing chunk ${j}:`, chunkError);
          }
        }

        console.log(`   ✅ Successfully uploaded ${successfulChunks}/${chunks.length} chunks to Pinecone`);
        processedFiles.push({ name: file.name || 'Unknown', chunks: successfulChunks });
        totalChunks += successfulChunks;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`   ❌ Error: ${errorMessage}`);
        processedFiles.push({ 
          name: file.name || 'Unknown', 
          chunks: 0, 
          error: errorMessage.substring(0, 100) 
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PROCESSING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total files: ${files.length}`);
    console.log(`Files processed: ${processedFiles.filter(f => f.chunks > 0).length}`);
    console.log(`Files failed: ${processedFiles.filter(f => f.chunks === 0).length}`);
    console.log(`Total chunks created: ${totalChunks}`);
    console.log('\n✅ Processing complete!');

    if (processedFiles.filter(f => f.chunks === 0).length > 0) {
      console.log('\n⚠️  Failed files:');
      processedFiles
        .filter(f => f.chunks === 0)
        .forEach(f => {
          console.log(`   - ${f.name}: ${f.error || 'Unknown error'}`);
        });
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
vectorizeDriveFiles();

