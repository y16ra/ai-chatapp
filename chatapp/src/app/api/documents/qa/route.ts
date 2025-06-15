import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments } from '@/lib/db';

// OpenAI Embedding API
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// OpenAI Chat Completion API
async function generateAnswer(question: string, context: string): Promise<ReadableStream> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは文書に基づいて質問に答えるAIアシスタントです。以下のコンテキストを参考にして、質問に正確に答えてください。

コンテキスト:
${context}

回答の際は以下の点に注意してください：
1. コンテキストに基づいて正確に答える
2. コンテキストに情報がない場合は「提供された文書には該当する情報がありません」と答える
3. 簡潔で分かりやすい回答を心がける
4. 必要に応じて引用や参照を含める`
        },
        {
          role: 'user',
          content: question
        }
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  return response.body!;
}

export async function POST(request: NextRequest) {
  try {
    const { question, userId, roomId, documentId, selectedFiles } = await request.json();

    if (!question || !userId || !roomId) {
      return NextResponse.json(
        { error: 'Question, userId, and roomId are required' },
        { status: 400 }
      );
    }

    // Generate embedding for the question
    const questionEmbedding = await generateEmbedding(question);

    // Search for relevant document chunks
    const searchResults = await searchDocuments(
      userId,
      roomId,
      questionEmbedding,
      documentId || null,
      5, // Top 5 results
      selectedFiles // Pass selected files filter
    );

    if (searchResults.length === 0) {
      return NextResponse.json(
        { error: 'No relevant documents found' },
        { status: 404 }
      );
    }

    // Combine context from search results
    const context = searchResults
      .map((result, index) => 
        `[文書${index + 1}: ${result.filename}${result.page_number ? ` (ページ ${result.page_number})` : ''}]\n${result.chunk_text}`
      )
      .join('\n\n');

    // Generate answer using OpenAI
    const answerStream = await generateAnswer(question, context);

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = answerStream.getReader();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Send sources information at the end
              const sourcesData = {
                type: 'sources',
                sources: searchResults.map(result => ({
                  filename: result.filename,
                  pageNumber: result.page_number,
                  similarity: result.similarity,
                  preview: result.chunk_text.substring(0, 200) + '...'
                }))
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(sourcesData)}\n\n`));
              controller.close();
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  continue;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    const responseData = {
                      type: 'content',
                      content: content
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(responseData)}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('QA error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
