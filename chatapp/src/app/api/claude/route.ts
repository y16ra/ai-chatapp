import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SUPPORTED_MODELS = [
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-2.1'
];

export async function POST(req: NextRequest) {
  const { inputMessage, context, model } = await req.json();

  if (!SUPPORTED_MODELS.includes(model)) {
    return NextResponse.json({ error: 'Unsupported model' }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: model || 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        ...context.map((msg: { text: string, sender: string }) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        })),
        { role: "user", content: inputMessage }
      ]
    });

    let botResponse = '';
    if (response.content && response.content.length > 0) {
      const contentBlock = response.content[0];
      if (contentBlock.type === 'text') {
        botResponse = contentBlock.text;
      } else if (contentBlock.type === 'tool_use') {
        botResponse = JSON.stringify(contentBlock);
      }
    }

    return NextResponse.json({ 
      botResponse: botResponse
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
