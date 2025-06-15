-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create docs table for storing document embeddings
CREATE TABLE IF NOT EXISTS docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    room_id TEXT,
    filename TEXT NOT NULL,
    file_path TEXT,
    mime_type TEXT NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),
    page_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search using IVFFlat
CREATE INDEX IF NOT EXISTS docs_embedding_idx 
ON docs USING ivfflat (embedding vector_l2_ops) 
WITH (lists = 100);

-- Create index for user_id for faster filtering
CREATE INDEX IF NOT EXISTS docs_user_id_idx ON docs (user_id);

-- Create index for room_id for faster filtering
CREATE INDEX IF NOT EXISTS docs_room_id_idx ON docs (room_id);

-- Create composite index for user_id and room_id for faster room-specific queries
CREATE INDEX IF NOT EXISTS docs_user_room_idx ON docs (user_id, room_id);

-- Create index for filename for faster filtering
CREATE INDEX IF NOT EXISTS docs_filename_idx ON docs (filename);

-- Create index for created_at for sorting
CREATE INDEX IF NOT EXISTS docs_created_at_idx ON docs (created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_docs_updated_at 
    BEFORE UPDATE ON docs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Migration note: If you have existing data without room_id, you can clean it up with:
-- DELETE FROM docs WHERE room_id IS NULL;
-- 
-- Or if you want to assign existing documents to a default room:
-- UPDATE docs SET room_id = 'default-room-id' WHERE room_id IS NULL;
