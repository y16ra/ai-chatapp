import { NextRequest, NextResponse } from 'next/server';
import { deleteDocument } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, roomId, filename } = await request.json();

    if (!userId || !roomId || !filename) {
      return NextResponse.json(
        { error: 'User ID, Room ID, and filename are required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting document:', { userId, roomId, filename });

    // データベースからドキュメントを削除
    const deletedCount = await deleteDocument(userId, roomId, filename);
    
    if (deletedCount === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Deleted ${deletedCount} document chunks from database`);
    // Note: No physical file cleanup needed as files are processed as temporary files only

    return NextResponse.json({
      message: 'Document deleted successfully',
      deletedChunks: deletedCount,
      filename: filename
    });

  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}