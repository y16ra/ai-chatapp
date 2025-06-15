import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { insertDocumentChunk } from '@/lib/db';

// OpenAI Embedding API
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    console.log('🔗 Generating embeddings...');
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Embeddings generated successfully');
    return data.data[0].embedding;
  } catch (error) {
    console.error('❌ Embedding generation failed:', error);
    throw error;
  }
}

// Simple text splitter function
function splitText(text: string): string[] {
  const maxChunkSize = 1000;
  const overlap = 200;
  const chunks: string[] = [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      
      // If single paragraph is too long, split it
      if (paragraph.length > maxChunkSize) {
        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length <= maxChunkSize) {
            sentenceChunk += (sentenceChunk ? '. ' : '') + sentence.trim();
          } else {
            if (sentenceChunk) {
              chunks.push(sentenceChunk.trim() + '.');
            }
            sentenceChunk = sentence.trim();
          }
        }
        
        if (sentenceChunk) {
          currentChunk = sentenceChunk.trim() + '.';
        } else {
          currentChunk = '';
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

// PDF parsing with actual text extraction
async function parsePDF(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  console.log('📖 Processing PDF file...');
  
  try {
    console.log('🔧 Attempting to load pdf-parse...');
    const pdfParse = require('pdf-parse');
    console.log('✅ pdf-parse loaded successfully');
    
    console.log('🔧 Parsing PDF buffer...');
    const data = await pdfParse(buffer);
    console.log('✅ PDF parsing completed');
    
    console.log(`📊 PDF Results: Pages: ${data.numpages}, Text length: ${data.text.length}`);
    console.log(`📄 Text preview: ${data.text.substring(0, 200)}...`);
    
    if (data.text && data.text.trim().length > 0) {
      return {
        text: data.text,
        pageCount: data.numpages,
      };
    } else {
      console.log('⚠️ PDF parsing returned empty text, using fallback');
    }
  } catch (error) {
    console.error('❌ PDF parsing failed with error:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.log('📖 Using fallback PDF processing...');
  }
  
  // Fallback: basic information without actual text extraction
  const sizeInKB = Math.round(buffer.length / 1024);
  const estimatedPages = Math.max(1, Math.ceil(buffer.length / 100000)); // Rough estimate
  
  console.log(`✅ PDF processed (fallback). Size: ${sizeInKB}KB, Estimated pages: ${estimatedPages}`);
  
  return {
    text: `PDF document uploaded: ${sizeInKB}KB, estimated ${estimatedPages} pages. Text extraction failed - content analysis not available.`,
    pageCount: estimatedPages,
  };
}

// Add GET handler for testing
export async function GET(request: NextRequest) {
  console.log('✅ GET /api/documents/upload called - Route is working!');
  return NextResponse.json({ 
    message: 'Document upload endpoint is working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('🚀 Upload API called - route.ts is executing');
  
  try {
    console.log('📝 Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const roomId = formData.get('roomId') as string;

    console.log('📄 File received:', file?.name, 'Size:', file?.size);
    console.log('👤 User ID:', userId);
    console.log('🏠 Room ID:', roomId);

    if (!file || !userId || !roomId) {
      console.log('❌ Missing file, userId, or roomId');
      return NextResponse.json(
        { error: 'File, userId, and roomId are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const isPdf = file.type === 'application/pdf';
    const isMarkdown = file.name.endsWith('.md') || file.name.endsWith('.markdown');

    if (!isPdf && !isMarkdown) {
      console.log('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'Only PDF and Markdown files are supported' },
        { status: 400 }
      );
    }

    // Create temporary file for processing
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempFilePath = join(tmpdir(), `temp_${userId}_${Date.now()}_${file.name}`);
    await writeFile(tempFilePath, new Uint8Array(buffer));

    console.log('✅ Temporary file created:', tempFilePath);

    let parsedContent: string = '';
    let pageCount: number | undefined;

    try {
      // Parse file content
      if (isPdf) {
        const pdfData = await parsePDF(buffer);
        parsedContent = pdfData.text;
        pageCount = pdfData.pageCount;
      } else {
        // Markdown parsing
        const content = buffer.toString('utf-8');
        parsedContent = content;
        console.log('📝 Markdown parsed. Text length:', parsedContent.length);
      }
    } finally {
      // Always clean up temporary file
      try {
        await unlink(tempFilePath);
        console.log('🗑️ Temporary file cleaned up:', tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temporary file:', cleanupError);
      }
    }

    if (!parsedContent.trim()) {
      console.log('❌ No text content found in file');
      return NextResponse.json(
        { error: 'No text content found in the file' },
        { status: 400 }
      );
    }

    console.log('✅ Content extracted successfully. Length:', parsedContent.length);

    // Split text into chunks
    const chunks = splitText(parsedContent);
    console.log('📝 Text split into chunks:', chunks.length);

    // Process each chunk and save to database
    const processedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        console.log(`🔗 Processing chunk ${i + 1}/${chunks.length}...`);
        
        // Generate embedding for chunk
        const embedding = await generateEmbedding(chunk);

        // Insert into database
        const docId = await insertDocumentChunk(
          userId,
          roomId,
          file.name,
          null, // No file path stored for temporary files
          file.type,
          parsedContent,
          i,
          chunk,
          embedding,
          pageCount ? Math.floor(i / (chunks.length / pageCount)) + 1 : undefined
        );

        processedChunks.push({
          id: docId,
          chunkIndex: i,
          text: chunk.substring(0, 100) + '...', // Preview
        });

        console.log(`✅ Chunk ${i + 1} saved with ID: ${docId}`);

        // Add small delay to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Error processing chunk ${i}:`, error);
        // Continue with other chunks even if one fails
      }
    }

    console.log(`🎉 Processing complete! ${processedChunks.length}/${chunks.length} chunks saved successfully`);

    return NextResponse.json({
      message: 'File uploaded, processed, and saved to database successfully',
      filename: file.name,
      fileSize: file.size,
      fileType: file.type,
      pageCount: pageCount,
      contentLength: parsedContent.length,
      contentPreview: parsedContent.substring(0, 200) + '...',
      chunksTotal: chunks.length,
      chunksSaved: processedChunks.length,
      chunks: processedChunks
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}