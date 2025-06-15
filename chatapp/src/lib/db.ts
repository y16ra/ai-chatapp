import { Pool, PoolClient } from 'pg';

// PostgreSQL connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

// Database connection wrapper
export async function withDb<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

// Document interface for type safety
export interface Document {
  id: string;
  user_id: string;
  filename: string;
  file_path?: string;
  mime_type: string;
  content: string;
  chunk_index: number;
  chunk_text: string;
  embedding?: number[];
  page_number?: number;
  created_at: Date;
  updated_at: Date;
}

// Insert document chunk with embedding
export async function insertDocumentChunk(
  userId: string,
  roomId: string,
  filename: string,
  filePath: string | null,
  mimeType: string,
  content: string,
  chunkIndex: number,
  chunkText: string,
  embedding: number[],
  pageNumber?: number
): Promise<string> {
  return withDb(async (client) => {
    const query = `
      INSERT INTO docs (
        user_id, room_id, filename, file_path, mime_type, content, 
        chunk_index, chunk_text, embedding, page_number
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;
    
    const values = [
      userId,
      roomId,
      filename,
      filePath,
      mimeType,
      content,
      chunkIndex,
      chunkText,
      `[${embedding.join(',')}]`, // Convert array to vector format
      pageNumber
    ];
    
    const result = await client.query(query, values);
    return result.rows[0].id;
  });
}

// Search similar documents using vector similarity
export async function searchSimilarDocuments(
  userId: string,
  queryEmbedding: number[],
  limit: number = 4,
  filename?: string
): Promise<Document[]> {
  return withDb(async (client) => {
    let query = `
      SELECT 
        id, user_id, filename, file_path, mime_type, content,
        chunk_index, chunk_text, page_number, created_at, updated_at,
        embedding <-> $2 AS distance
      FROM docs 
      WHERE user_id = $1
    `;
    
    const values: any[] = [userId, `[${queryEmbedding.join(',')}]`];
    
    if (filename) {
      query += ` AND filename = $3`;
      values.push(filename);
      query += ` ORDER BY distance LIMIT $4`;
      values.push(limit);
    } else {
      query += ` ORDER BY distance LIMIT $3`;
      values.push(limit);
    }
    
    const result = await client.query(query, values);
    return result.rows.map(row => ({
      ...row,
      embedding: undefined // Don't return embedding in search results
    }));
  });
}

// Search for similar documents using vector similarity
export async function searchDocuments(
  userId: string,
  roomId: string,
  queryEmbedding: number[],
  documentId?: string | null,
  limit: number = 5,
  selectedFiles?: string[]
): Promise<Array<{
  id: string;
  filename: string;
  chunk_text: string;
  page_number?: number;
  similarity: number;
}>> {
  return withDb(async (client) => {
    let query = `
      SELECT 
        id,
        filename,
        chunk_text,
        page_number,
        1 - (embedding <=> $3::vector) as similarity
      FROM docs 
      WHERE user_id = $1 AND room_id = $2
    `;
    
    const params: any[] = [userId, roomId, JSON.stringify(queryEmbedding)];
    
    if (documentId) {
      query += ` AND filename = $4`;
      params.push(documentId);
    } else if (selectedFiles && selectedFiles.length > 0) {
      // If specific files are selected, only search within those files
      const placeholders = selectedFiles.map((_, index) => `$${params.length + 1 + index}`).join(', ');
      query += ` AND filename IN (${placeholders})`;
      params.push(...selectedFiles);
    }
    
    query += `
      ORDER BY embedding <=> $3::vector
      LIMIT $${params.length + 1}
    `;
    params.push(limit);
    
    const result = await client.query(query, params);
    return result.rows;
  });
}

// Get room's documents list
export async function getRoomDocuments(userId: string, roomId: string): Promise<{
  filename: string;
  mime_type: string;
  created_at: Date;
  chunk_count: number;
}[]> {
  return withDb(async (client) => {
    const query = `
      SELECT 
        filename, 
        mime_type, 
        MIN(created_at) as created_at,
        COUNT(*) as chunk_count
      FROM docs 
      WHERE user_id = $1 AND room_id = $2
      GROUP BY filename, mime_type
      ORDER BY created_at DESC
    `;
    
    const result = await client.query(query, [userId, roomId]);
    return result.rows;
  });
}

// Delete document by filename
export async function deleteDocument(userId: string, roomId: string, filename: string): Promise<number> {
  return withDb(async (client) => {
    const query = `
      DELETE FROM docs 
      WHERE user_id = $1 AND room_id = $2 AND filename = $3
    `;
    
    const result = await client.query(query, [userId, roomId, filename]);
    return result.rowCount || 0;
  });
}

// Health check for database connection
export async function checkDbHealth(): Promise<boolean> {
  try {
    return await withDb(async (client) => {
      const result = await client.query('SELECT 1');
      return result.rows.length > 0;
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
