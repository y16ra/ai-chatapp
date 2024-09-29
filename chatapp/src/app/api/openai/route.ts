import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const { inputMessage } = await req.json();

  try {
    const gpt3Response = await openai.chat.completions.create({
      messages: [{ role: "user", content: inputMessage }],
      model: "gpt-3.5-turbo",
    });

    const botResponse = gpt3Response.choices[0].message.content;
    return NextResponse.json({ botResponse });
  } catch (error) {
    return NextResponse.json({ error: 'Error generating response from OpenAI' }, { status: 500 });
  }
}
