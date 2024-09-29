import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const { inputMessage, context } = await req.json();
  console.log(inputMessage, context);
  try {
    const gpt3Response = await openai.chat.completions.create({
      messages: [
        ...context.map((msg: { text: string, sender: string }) => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        })),
        { role: "user", content: inputMessage }
      ],
      // model: "gpt-3.5-turbo",
      model: "gpt-4o-mini",
    });

    const botResponse = gpt3Response.choices[0].message.content;
    return NextResponse.json({ botResponse });
  } catch (error) {
    return NextResponse.json({ error: 'Error generating response from OpenAI' }, { status: 500 });
  }
}
