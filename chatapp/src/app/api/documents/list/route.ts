import { NextRequest, NextResponse } from 'next/server';
import { getRoomDocuments } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, roomId } = await request.json();

    if (!userId || !roomId) {
      return NextResponse.json(
        { error: 'User ID and Room ID are required' },
        { status: 400 }
      );
    }

    console.log('📄 Fetching documents for user:', userId, 'room:', roomId);
    const documents = await getRoomDocuments(userId, roomId);
    
    console.log('✅ Found documents:', documents.length);

    return NextResponse.json({
      documents: documents.map(doc => ({
        filename: doc.filename,
        uploadedAt: doc.created_at.toISOString(),
        fileSize: doc.mime_type === 'application/pdf' ? undefined : undefined,
        pageCount: undefined,
        mimeType: doc.mime_type,
        chunkCount: doc.chunk_count
      }))
    });

  } catch (error) {
    console.error('Document list error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}