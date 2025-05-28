"use client";

import React, { useEffect, useRef, useState } from "react";
import { GoPaperAirplane } from "react-icons/go";
import { FaCheck, FaCheckDouble, FaRedo, FaHeart, FaRegHeart } from "react-icons/fa";
import { db } from "../../../firebase";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { useAppContext } from "@/context/AppContext";
import LoadingIcons from 'react-loading-icons';
import ModelComparison, { ComparisonResult } from './ModelComparison';
import { AI_MODELS, DEFAULT_COMPARISON_MODELS, getModelProvider, isClaudeModel } from '@/constants/models';

type Message = {
  text: string;
  sender: string;
  createdAt: Timestamp;
  isRead?: boolean;
  readAt?: Timestamp;
};

const Chat = () => {

  const { selectedRoom, selectRoomName, userId } = useAppContext();
  const [inputMessage, setInputMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  const [selectedAgent, setSelectedAgent] = useState<string>("none");
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [comparisonQuestion, setComparisonQuestion] = useState<string>("");
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(false);

  const scrollDiv = useRef<HTMLDivElement>(null);

  // タイムスタンプをフォーマットする関数
  const formatTimestamp = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      // 24時間以内は時刻のみ表示
      return date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      // 24時間以上前は日付と時刻を表示
      return date.toLocaleString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Get the current AI provider based on the selected model
  const getCurrentAIProvider = (): string => {
    return getModelProvider(selectedModel);
  };

    // Retrieve messages for the selected room from Firestore
  useEffect(() => {
    if (selectedRoom) {
      const fetchMessages = async () => {
        const roomDocRef = doc(db, "rooms", selectedRoom);
        const messageCollectionRef = collection(roomDocRef, "messages");

        const q = query(messageCollectionRef, orderBy("createdAt"));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const messagesWithIds = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          } as Message & { id: string }));
          console.log(messagesWithIds);
          setMessages(messagesWithIds);

          // ボットのメッセージで未読のものを既読にする
          const unreadBotMessages = messagesWithIds.filter(
            msg => msg.sender === "bot" && !msg.isRead
          );

          for (const message of unreadBotMessages) {
            try {
              const messageRef = doc(db, "rooms", selectedRoom, "messages", message.id);
              await updateDoc(messageRef, {
                isRead: true,
                readAt: serverTimestamp()
              });
            } catch (error) {
              console.error("Error updating read status:", error);
            }
          }
        });
        return () => {
          unsubscribe();
        }
      };
      fetchMessages();
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (scrollDiv.current) {
      const element = scrollDiv.current;
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, streamingMessage]);

  const [isComposing, setComposition] = useState(false);
  const startComposition = () => setComposition(true);
  const endComposition = () => setComposition(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = async () => {
    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    console.log(inputMessage);
    if (!inputMessage.trim()) {
      return;
    }
    const messageData = {
      text: inputMessage,
      sender: "user",
      createdAt: serverTimestamp(),
      isRead: true, // ユーザー自身のメッセージは既読扱い
      readAt: serverTimestamp(),
    };
    // Store message to Firestore
    const roomDocRef = doc(db, "rooms", selectedRoom!);
    const messageCollectionRef = collection(roomDocRef, "messages");
    await addDoc(messageCollectionRef, messageData);

    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);
    setStreamingMessage("");

    // Determine which API endpoint to use based on the selected model
    const apiEndpoint = isClaudeModel(selectedModel) ? '/api/claude' : '/api/openai';

    try {
      // Start streaming response
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputMessage: currentInput,
          context: messages.map(message => ({
            text: message.text,
            sender: message.sender
          })),
          model: selectedModel,
          enableWebSearch: isClaudeModel(selectedModel) ? enableWebSearch : false
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                setStreamingMessage(fullResponse);
              } else if (parsed.type === 'tool_use_start') {
                // Web検索開始の表示
                const toolInfo = `🔍 Web検索中: ${parsed.tool.name}\n\n`;
                fullResponse += toolInfo;
                setStreamingMessage(fullResponse);
              } else if (parsed.type === 'tool_input_delta') {
                // ツール入力パラメータの表示（オプション）
                console.log('Tool input:', parsed.partial_json);
              } else if (parsed.type === 'tool_use_complete') {
                // Web検索完了の表示（ログのみ、UIには表示しない）
                console.log('Web search completed for index:', parsed.index);
              }
            } catch (e) {
              // Ignore JSON parsing errors
            }
          }
        }
      }

      setIsLoading(false);
      setStreamingMessage("");

      // Save complete response to Firestore
      await addDoc(messageCollectionRef, {
        text: fullResponse,
        sender: "bot",
        createdAt: serverTimestamp(),
        isRead: false, // ボットのメッセージは未読で作成
      });

    } catch (error) {
      console.error('Streaming error:', error);
      setIsLoading(false);
      setStreamingMessage("");

      // Fallback to regular message
      await addDoc(messageCollectionRef, {
        text: "エラーが発生しました。もう一度お試しください。",
        sender: "bot",
        createdAt: serverTimestamp(),
        isRead: false,
      });
    }
  }

  // AIレスポンスを再生成する関数
  const regenerateResponse = async (messageIndex: number) => {
    if (!selectedRoom || isLoading) return;

    // 再生成対象のメッセージを取得
    const targetMessage = messages[messageIndex];
    if (!targetMessage || targetMessage.sender !== "bot") {
      console.error("Invalid message for regeneration");
      return;
    }

    // 対応するユーザーメッセージを逆方向に検索
    let previousUserMessage = null;
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].sender === "user") {
        previousUserMessage = messages[i];
        break;
      }
    }

    if (!previousUserMessage) {
      console.error("No corresponding user message found for regeneration");
      return;
    }

    const messageId = (targetMessage as any).id;
    setRegeneratingMessageId(messageId);
    setStreamingMessage("");

    const roomDocRef = doc(db, "rooms", selectedRoom);
    const messageCollectionRef = collection(roomDocRef, "messages");

    // 再生成時のコンテキストを構築（対象メッセージより前のメッセージのみ）
    const contextMessages = messages.slice(0, messageIndex);

    // 現在選択されているモデルでAPIエンドポイントを決定
    const apiEndpoint = isClaudeModel(selectedModel) ? '/api/claude' : '/api/openai';

    try {
      // ストリーミングレスポンス開始
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputMessage: previousUserMessage.text,
          context: contextMessages.map(message => ({
            text: message.text,
            sender: message.sender
          })),
          model: selectedModel,
          enableWebSearch: isClaudeModel(selectedModel) ? enableWebSearch : false
        }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                setStreamingMessage(fullResponse);
              } else if (parsed.type === 'tool_use_start') {
                // Web検索開始の表示
                const toolInfo = `🔍 Web検索中: ${parsed.tool.name}\n\n`;
                fullResponse += toolInfo;
                setStreamingMessage(fullResponse);
              } else if (parsed.type === 'tool_input_delta') {
                // ツール入力パラメータの表示（オプション）
                console.log('Tool input:', parsed.partial_json);
              } else if (parsed.type === 'tool_use_complete') {
                // Web検索完了の表示（ログのみ、UIには表示しない）
                console.log('Web search completed for index:', parsed.index);
              }
            } catch (e) {
              // Ignore JSON parsing errors
            }
          }
        }
      }

      setRegeneratingMessageId(null);
      setStreamingMessage("");

      // 既存のメッセージを新しい内容で更新
      const messageRef = doc(db, "rooms", selectedRoom, "messages", messageId);
      await updateDoc(messageRef, {
        text: fullResponse,
        createdAt: serverTimestamp(),
        isRead: false,
      });

    } catch (error) {
      console.error('Regeneration error:', error);
      setRegeneratingMessageId(null);
      setStreamingMessage("");
    }
  };

  // お気に入り機能
  const toggleFavorite = async (messageId: string, messageText: string) => {
    if (!userId || !selectedRoom) return;
    
    try {
      const favoriteRef = doc(db, "users", userId, "favorites", messageId);
      
      if (favorites.has(messageId)) {
        // お気に入りから削除
        await deleteDoc(favoriteRef);
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(messageId);
          return newFavorites;
        });
      } else {
        // お気に入りに追加
        await addDoc(collection(db, "users", userId, "favorites"), {
          messageId,
          roomId: selectedRoom,
          messageText,
          createdAt: serverTimestamp(),
          timestamp: serverTimestamp()
        });
        setFavorites(prev => new Set(prev).add(messageId));
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  // お気に入り状態を読み込む
  useEffect(() => {
    if (!userId) return;
    
    const favoritesRef = collection(db, "users", userId, "favorites");
    const unsubscribe = onSnapshot(favoritesRef, (snapshot) => {
      const favoriteIds = new Set(snapshot.docs.map(doc => doc.data().messageId));
      setFavorites(favoriteIds);
    });
    
    return () => unsubscribe();
  }, [userId]);

  // モデル比較機能
  const compareModels = async (question: string, models: string[]) => {
    setComparisonQuestion(question);
    setShowComparison(true);
    
    // 初期状態を設定
    const initialResults = models.map(model => ({
      model,
      response: "",
      status: 'loading' as const
    }));
    setComparisonResults(initialResults);

    // 各モデルで並列実行
    const promises = models.map(async (model, index) => {
      try {
        const apiEndpoint = model.startsWith('claude') ? '/api/claude' : '/api/openai';
        
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputMessage: question,
            context: messages.map(message => ({
              text: message.text,
              sender: message.sender
            })),
            model: model
          }),
        });

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  // リアルタイム更新
                  setComparisonResults(prev => prev.map((result, i) => 
                    i === index 
                      ? { ...result, response: fullResponse, status: 'loading' }
                      : result
                  ));
                }
              } catch (e) {
                // Ignore JSON parsing errors
              }
            }
          }
        }

        // 完了状態に更新
        setComparisonResults(prev => prev.map((result, i) => 
          i === index 
            ? { ...result, response: fullResponse, status: 'completed' }
            : result
        ));

      } catch (error) {
        console.error(`Error with model ${model}:`, error);
        setComparisonResults(prev => prev.map((result, i) => 
          i === index 
            ? { ...result, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
            : result
        ));
      }
    });

    await Promise.all(promises);
  };

  // 比較モードでの再生成
  const handleComparisonRegenerate = (models: string[]) => {
    compareModels(comparisonQuestion, models);
  };

  // メッセージ履歴をクリアする関数
  const clearChatHistory = async () => {
    if (!selectedRoom) return;
    if (!window.confirm(`「${selectRoomName}」のチャット履歴をクリアしますか？この操作は元に戻せません。`)) return;
    setIsLoading(true);
    try {
      const roomDocRef = doc(db, "rooms", selectedRoom);
      const messageCollectionRef = collection(roomDocRef, "messages");
      const snapshot = await getDocs(query(messageCollectionRef));
      const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      setMessages([]);
    } catch (error) {
      console.error("Error clearing chat history:", error);
      alert("チャット履歴のクリアに失敗しました。再度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-500 h-full flex flex-col">
      {/* 固定ヘッダー */}
      <div className="flex-none bg-gray-500 p-2 sm:p-4 border-b border-gray-400">
        <h1 className="text-xl sm:text-2xl text-white font-semibold mb-2 sm:mb-4 truncate">{selectRoomName}</h1>
        <div className="flex mb-2 sm:mb-4 gap-2 sm:gap-4 flex-wrap"> {/* レスポンシブ対応のスペーシング */}
        <div className="flex items-center mb-2">
          <label className="text-white mr-2">AI Provider:</label>
          <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
            {getCurrentAIProvider()}
          </span>
        </div>
        <div className="mb-2 flex-1 min-w-0">
          <label className="text-white mr-2 text-sm sm:text-base">Select AI Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              // Claudeモデル以外の場合はWeb検索を無効化
              if (!isClaudeModel(e.target.value)) {
                setEnableWebSearch(false);
              }
            }}
            className="w-full sm:w-auto px-2 sm:px-3 py-2 bg-white text-gray-700 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm sm:text-base"
          >
            {AI_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
          {isClaudeModel(selectedModel) && (
            <div className="mt-2 flex items-center">
              <input
                type="checkbox"
                id="enableWebSearch"
                checked={enableWebSearch}
                onChange={(e) => setEnableWebSearch(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enableWebSearch" className="ml-2 block text-sm text-white">
                Enable Web Search
              </label>
            </div>
          )}
        </div>
        <div className="mb-2 flex gap-2">
          <button
            onClick={clearChatHistory}
            disabled={!selectedRoom || messages.length === 0}
            className="bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            履歴クリア
          </button>
          <button
            onClick={() => {
              if (inputMessage.trim()) {
                compareModels(inputMessage, DEFAULT_COMPARISON_MODELS);
              }
            }}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-purple-500 hover:bg-purple-600 text-white px-2 sm:px-3 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            モデル比較
          </button>
        </div>
        </div>
      </div>
      
      {/* メッセージエリア */}
      <div ref={scrollDiv} className="flex-1 overflow-y-auto p-2 sm:p-4 pb-0 min-h-0">
          {messages.map((message, index) => (
            <div
              key={index}
              className={message.sender === "user" ? "text-right" : "text-left"}>
                <div
                  className={
                    message.sender === "user"
                    ? "bg-blue-500 inline-block rounded px-3 sm:px-4 py-2 mb-2 whitespace-pre-wrap max-w-[280px] sm:max-w-xs md:max-w-md lg:max-w-lg"
                    : "bg-green-500 inline-block rounded px-3 sm:px-4 py-2 mb-2 whitespace-pre-wrap max-w-[280px] sm:max-w-xs md:max-w-md lg:max-w-lg"
                      }
                >
                <p className="text-white">{message.text}</p>
                <div className={`text-xs mt-1 flex items-center justify-between ${
                  message.sender === "user" ? "text-blue-200" : "text-green-200"
                }`}>
                  <span>{formatTimestamp(message.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    {message.sender === "bot" && (
                      <button
                        onClick={() => toggleFavorite((message as any).id, message.text)}
                        className="hover:bg-green-600 p-1 rounded transition-colors"
                        title={favorites.has((message as any).id) ? "お気に入りから削除" : "お気に入りに追加"}
                      >
                        {favorites.has((message as any).id) ? (
                          <FaHeart className="text-xs text-red-400" />
                        ) : (
                          <FaRegHeart className="text-xs" />
                        )}
                      </button>
                    )}
                    {message.sender === "bot" && (() => {
                      // 最後のbotメッセージかどうかをチェック
                      let isLastBotMessage = true;
                      for (let i = index + 1; i < messages.length; i++) {
                        if (messages[i].sender === "bot") {
                          isLastBotMessage = false;
                          break;
                        }
                      }

                      // 直前にユーザーメッセージがあるかチェック
                      let hasUserMessageBefore = false;
                      for (let i = index - 1; i >= 0; i--) {
                        if (messages[i].sender === "user") {
                          hasUserMessageBefore = true;
                          break;
                        } else if (messages[i].sender === "bot") {
                          break; // 連続するbotメッセージの場合は停止
                        }
                      }

                      return isLastBotMessage && hasUserMessageBefore;
                    })() && (
                      <button
                        onClick={() => regenerateResponse(index)}
                        disabled={regeneratingMessageId === (message as any).id || isLoading}
                        className="hover:bg-green-600 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="回答を再生成"
                      >
                        <FaRedo className="text-xs" />
                      </button>
                    )}
                    {message.sender === "user" && (
                      <span className="ml-2">
                        {message.isRead ? (
                          <FaCheckDouble className="inline" title="既読" />
                        ) : (
                          <FaCheck className="inline" title="送信済み" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {streamingMessage && (
            <div className="text-left">
              <div className="bg-green-500 inline-block rounded px-3 sm:px-4 py-2 mb-2 whitespace-pre-wrap max-w-[280px] sm:max-w-xs md:max-w-md lg:max-w-lg">
                <p className="text-white">{streamingMessage}</p>
                <span className="text-green-200 animate-pulse">▋</span>
                <div className="text-xs mt-1 flex items-center justify-between text-green-200">
                  <span>
                    {new Date().toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {regeneratingMessageId && (
                    <span className="text-xs">再生成中...</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {isLoading && !streamingMessage && <LoadingIcons.TailSpin />}
      </div>
      
      {/* 固定入力エリア */}
      <div className="flex-none bg-gray-500 p-2 sm:p-4 border-t border-gray-400">
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="w-full p-2 sm:p-3 pr-12 sm:pr-14 rounded border-2 focus:outline-none resize-none overflow-hidden min-h-[40px] text-sm sm:text-base"
            placeholder="Type a message..."
            value={inputMessage}
            onCompositionStart={startComposition}
            onCompositionEnd={endComposition}
            onChange={(e) => {
              setInputMessage(e.target.value);

              // Auto-resize textarea
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.metaKey) {
                  // Command+Enter to send message
                  e.preventDefault();
                  handleSendMessage();
                } else {
                  // Auto-resize on Enter key press after the default line break is added
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                    }
                  }, 0);
                }
              }
            }}
            rows={1}
          />
          <button
            className="absolute right-2 sm:right-3 top-2 sm:top-3 rounded p-1 hover:bg-gray-100"
            onClick={handleSendMessage}
          >
            <GoPaperAirplane className="text-sm sm:text-base" />
          </button>
          <span className="absolute right-2 sm:right-3 bottom-1 text-xs text-gray-400 italic">⌘+Enter to send</span>
        </div>
      </div>
      
      <ModelComparison
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        question={comparisonQuestion}
        results={comparisonResults}
        onRegenerate={handleComparisonRegenerate}
      />
    </div>

  );
}

export default Chat;
