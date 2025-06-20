import { NextRequest, NextResponse } from 'next/server';
import { withDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Checking database for room_id consistency...');
    
    const result = await withDb(async (client) => {
      // Total records
      const totalResult = await client.query('SELECT COUNT(*) as total FROM docs');
      const total = parseInt(totalResult.rows[0].total);

      // Records without room_id
      const withoutRoomIdResult = await client.query('SELECT COUNT(*) as count FROM docs WHERE room_id IS NULL OR room_id = \'\'');
      const withoutRoomId = parseInt(withoutRoomIdResult.rows[0].count);

      // Records with room_id
      const withRoomIdResult = await client.query('SELECT COUNT(*) as count FROM docs WHERE room_id IS NOT NULL AND room_id != \'\'');
      const withRoomId = parseInt(withRoomIdResult.rows[0].count);

      // Sample invalid records
      let sampleInvalid = [];
      if (withoutRoomId > 0) {
        const sampleResult = await client.query(`
          SELECT id, user_id, filename, room_id, created_at 
          FROM docs 
          WHERE room_id IS NULL OR room_id = '' 
          LIMIT 5
        `);
        sampleInvalid = sampleResult.rows;
      }

      // Room distribution
      const distributionResult = await client.query(`
        SELECT 
          room_id, 
          COUNT(*) as count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT filename) as unique_files
        FROM docs 
        WHERE room_id IS NOT NULL AND room_id != ''
        GROUP BY room_id 
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        total,
        withRoomId,
        withoutRoomId,
        sampleInvalid,
        distribution: distributionResult.rows
      };
    });

    console.log('📊 Database check results:', result);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Found ${result.withoutRoomId} records without room_id out of ${result.total} total records`
    });

  } catch (error) {
    console.error('❌ Database check error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Database check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}