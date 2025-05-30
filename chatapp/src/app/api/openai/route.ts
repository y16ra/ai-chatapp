import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function addToMapIfDefined(map: Map<string, string>, key: string, value: string | undefined) {
  if (value !== undefined) {
    map.set(key, value);
  }
}

const SUPPORTED_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'o1',
  'o1-mini',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano'
];

// Web search is only supported by specific models (gpt-4o and gpt-4o-mini)
const WEB_SEARCH_SUPPORTED_MODELS = [
  'gpt-4o',
  'gpt-4o-mini'
];

// Map regular models to their search preview versions
const SEARCH_MODEL_MAP: Record<string, string> = {
  'gpt-4o': 'gpt-4o-search-preview',
  'gpt-4o-mini': 'gpt-4o-mini-search-preview'
};

export async function POST(req: NextRequest) {
  const { inputMessage, context, model, enableWebSearch } = await req.json();
  console.log(inputMessage, model, enableWebSearch);
  if (!SUPPORTED_MODELS.includes(model)) {
    return NextResponse.json({ error: 'Unsupported model' }, { status: 400 });
  }

  try {
    // Use search preview model if web search is enabled
    let actualModel = model || "gpt-4o-mini";
    if (enableWebSearch && WEB_SEARCH_SUPPORTED_MODELS.includes(model)) {
      actualModel = SEARCH_MODEL_MAP[model] || model;
    }

    const requestParams: any = {
      messages: [
        ...context.map((msg: { text: string, sender: string }) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        })),
        { role: "user", content: inputMessage }
      ],
      model: actualModel,
      stream: true,
    };

    // Add web search tool if enabled and supported by the model  
    if (enableWebSearch && WEB_SEARCH_SUPPORTED_MODELS.includes(model)) {
      // For search preview models, web search is automatically enabled
      // No explicit tools configuration needed
      console.log('Using search preview model:', actualModel);
    }

    const stream = await openai.chat.completions.create(requestParams);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            
            // Handle regular content
            const content = delta?.content || '';
            if (content) {
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }

            // For search preview models, web search is integrated into the response
            // No special tool handling needed - search results are included in content
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('OpenAI streaming error:', error);
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
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json({ 
      error: 'Error generating response from OpenAI',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

