import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SUPPORTED_MODELS = [
  'claude-3-7-sonnet-latest',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
  'claude-sonnet-4-20250514',
];

export async function POST(req: NextRequest) {
  const { inputMessage, context, model, enableWebSearch } = await req.json();

  if (!SUPPORTED_MODELS.includes(model)) {
    return NextResponse.json({ error: 'Unsupported model' }, { status: 400 });
  }

  try {
    // 空のメッセージを除外し、メッセージを正規化
    const normalizedMessages = [
      ...context
        .filter((msg: { text: string }) => msg.text && msg.text.trim() !== '')
        .map((msg: { text: string; sender: string }) => ({
          role: msg.sender === "user" ? "user" as const : "assistant" as const,
          content: msg.text.trim()
        })),
      { role: "user" as const, content: inputMessage.trim() }
    ];

    const requestParams: Anthropic.Messages.MessageCreateParamsStreaming = {
      model: model || 'claude-3-5-sonnet-latest',
      max_tokens: 4000, // Web検索結果を含む長い回答に対応
      messages: normalizedMessages,
      stream: true,
    };

    if (enableWebSearch) {
      // Claude APIの公式web search tool (web_search_20250305) を使用
      console.log('>>> Web search enabled for model:', model);
      
      // Web検索時はより多くのトークンを割り当て
      requestParams.max_tokens = 6000;
      
      requestParams.tools = [{
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5
      } as any];
      console.log('>>> Web search tool configured:', JSON.stringify(requestParams.tools, null, 2));
      
      // Web検索を促すためのシステムメッセージを追加
      const lastMessage = normalizedMessages[normalizedMessages.length - 1];
      if (lastMessage.content.includes('最新') || lastMessage.content.includes('リアルタイム') || lastMessage.content.includes('現在') || lastMessage.content.includes('今')) {
        lastMessage.content = lastMessage.content + "\n\n[最新情報が必要な場合は、web検索を使用して最新の情報を取得してください。]";
      }
    }

    const stream = anthropic.messages.stream(requestParams);

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Web Search Toolが有効な場合のレスポンス形式に対応
            if (chunk.type === 'message_delta') {
              // メッセージ完了時の処理
              continue;
            }
            
            if (chunk.type === 'message_start') {
              // メッセージ開始時の処理
              continue;
            }
            
            if (chunk.type === 'content_block_delta') {
              console.log('>>> content_block_delta CHUNK:', JSON.stringify(chunk, null, 2));
              // デルタタイプに応じて処理を分岐
              if (chunk.delta) {
                console.log('>>> chunk.delta EXISTS. Type of chunk.delta:', typeof chunk.delta, 'Value:', JSON.stringify(chunk.delta, null, 2));
                if (chunk.delta.type === 'text_delta' && chunk.delta.text) {
                  // テキストコンテンツのデルタ
                  const data = `data: ${JSON.stringify({ content: chunk.delta.text })}\n\n`;
                  controller.enqueue(encoder.encode(data));
                } else if (chunk.delta.type === 'input_json_delta') {
                  // ツール入力パラメータの更新
                  const delta = chunk.delta as any;
                  console.log('Tool input delta:', delta.partial_json);
                  const data = `data: ${JSON.stringify({ 
                    type: 'tool_input_delta', 
                    partial_json: delta.partial_json 
                  })}\n\n`;
                  controller.enqueue(encoder.encode(data));
                } else {
                  console.log('>>> chunk.delta.type is NOT text_delta or input_json_delta. chunk.delta.type =', chunk.delta.type);
                }
              } else {
                console.log('>>> chunk.delta IS UNDEFINED for content_block_delta chunk.');
              }
            } else if (chunk.type === 'content_block_start' && chunk.content_block && chunk.content_block.type === 'tool_use') {
              // Web検索ツール使用開始
              const toolData = chunk.content_block;
              console.log('Tool use started:', JSON.stringify(toolData, null, 2));
              // ツール使用開始をクライアントに送信
              const data = `data: ${JSON.stringify({ 
                type: 'tool_use_start', 
                tool: toolData 
              })}\n\n`;
              controller.enqueue(encoder.encode(data));
            } else if (chunk.type === 'content_block_stop') {
              // ContentBlockStopEvent does not have content_block property.
              // It only has an index.
              console.log('Content block stop event for index:', chunk.index);
              // ツール実行完了をクライアントに送信
              const data = `data: ${JSON.stringify({ 
                type: 'tool_use_complete', 
                index: chunk.index 
              })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          console.log('>>> Streaming completed successfully');
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
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
