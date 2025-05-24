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
  'o1-mini'
];

export async function POST(req: NextRequest) {
  const { inputMessage, context, model } = await req.json();
  console.log(inputMessage, model);
  if (!SUPPORTED_MODELS.includes(model)) {
    return NextResponse.json({ error: 'Unsupported model' }, { status: 400 });
  }

  try {
    const stream = await openai.chat.completions.create({
      messages: [
        ...context.map((msg: { text: string, sender: string }) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        })),
        { role: "user", content: inputMessage }
      ],
      model: model || "gpt-4o-mini",
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
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
  } catch (error) {
    return NextResponse.json({ error: 'Error generating response from OpenAI' }, { status: 500 });
  }
}

// Vector Storeから関連情報を使った回答を取得する関数
async function retrieveAgentData(inputMessage: string, assistantId: string) {
  const thread = await openai.beta.threads.create({
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: inputMessage,
        },
      ],
    }],
  });
  let run = await openai.beta.threads.runs.createAndPoll(
    thread.id,
    {
      assistant_id: assistantId,
    }
  );
  if (run.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(
      run.thread_id
    );
    console.log(messages.data[0].content)
    if (messages.data[0].content[0].type === "text") {

      return messages.data[0].content[0].text.value;
    }
  } else {
    console.log(run.status);
  }
  return null;
}
