import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SUPPORTED_MODELS = [
  'claude-3-7-sonnet-latest',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
];

export async function POST(req: NextRequest) {
  const { inputMessage, context, model } = await req.json();

  if (!SUPPORTED_MODELS.includes(model)) {
    return NextResponse.json({ error: 'Unsupported model' }, { status: 400 });
  }

  try {
    const stream = await anthropic.messages.create({
      model: model || 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        ...context.map((msg: { text: string, sender: string }) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        })),
        { role: "user", content: inputMessage }
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const content = chunk.delta.text;
              if (content) {
                const data = `data: ${JSON.stringify({ content })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Claude API Error:', error);
    const statusCode = error.status || 500;
    const errorMessage = error.error?.message || 'Unknown API error';

    return NextResponse.json(
      { error: `Claude API Error: ${errorMessage}` },
      { status: statusCode }
    );
  }
}
