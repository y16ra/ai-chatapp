"use client";

import React, { useEffect, useRef, useState } from "react";
import { GoPaperAirplane } from "react-icons/go";
import { db } from "../../../firebase";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, getDocs, deleteDoc } from "firebase/firestore";
import { useAppContext } from "@/context/AppContext";
import LoadingIcons from 'react-loading-icons'

type Message = {
  text: string;
  sender: string;
  createdAt: Timestamp;
};

const Chat = () => {

  const { selectedRoom, selectRoomName } = useAppContext();
  const [inputMessage, setInputMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
  const [selectedAgent, setSelectedAgent] = useState<string>("none");
  const [streamingMessage, setStreamingMessage] = useState<string>("");

  const scrollDiv = useRef<HTMLDivElement>(null);

  // モデルの選択肢を配列で定義
  const modelOptions = [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "o1", label: "o1" },
    { value: "o1-mini", label: "o1-mini" },
    { value: "claude-3-7-sonnet-latest", label: "Claude-3-7-Sonnet" },
    { value: "claude-3-5-sonnet-latest", label: "Claude-3-5-Sonnet" },
    { value: "claude-3-5-haiku-latest", label: "Claude-3-5-Haiku" },
  ];

  // Check if the selected model is a Claude model
  const isClaudeModel = (model: string): boolean => {
    return model.startsWith('claude');
  };

  // Get the current AI provider based on the selected model
  const getCurrentAIProvider = (): string => {
    if (isClaudeModel(selectedModel)) {
      return "Claude";
    } else {
      return "OpenAI";
    }
  };

    // Retrieve messages for the selected room from Firestore
  useEffect(() => {
    if (selectedRoom) {
      const fetchMessages = async () => {
        const roomDocRef = doc(db, "rooms", selectedRoom);
        const messageCollectionRef = collection(roomDocRef, "messages");

        const q = query(messageCollectionRef, orderBy("createdAt"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map((doc) => doc.data() as Message);
          console.log(messages);
          setMessages(messages);
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
          model: selectedModel
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
      });
    }
  }

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
    <div className="bg-gray-500 h-full flex flex-col p-4">
      <h1 className="text-2xl text-white font-semibold mb-4">{selectRoomName}</h1>
      <div className="flex mb-4 space-x-4 flex-wrap"> {/* フレックスボックスを使用して横並びに */}
        <div className="flex items-center mb-2">
          <label className="text-white mr-2">AI Provider:</label>
          <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
            {getCurrentAIProvider()}
          </span>
        </div>
        <div className="mb-2">
          <label className="text-white mr-2">Select AI Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-2 bg-white text-gray-700 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-2">
          <button
            onClick={clearChatHistory}
            disabled={!selectedRoom || messages.length === 0}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            履歴クリア
          </button>
        </div>
      </div>
      <div ref={scrollDiv} className="flex-grow overflow-y-auto mb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={message.sender === "user" ? "text-right" : "text-left"}>
                <div
                  className={
                    message.sender === "user"
                    ? "bg-blue-500 inline-block rounded px-4 py-2 mb-2 whitespace-pre-wrap"
                    : "bg-green-500 inline-block rounded px-4 py-2 mb-2 whitespace-pre-wrap"
                      }
                >
                <p className="text-white">{message.text}</p>
              </div>
            </div>
          ))}
          {streamingMessage && (
            <div className="text-left">
              <div className="bg-green-500 inline-block rounded px-4 py-2 mb-2 whitespace-pre-wrap">
                <p className="text-white">{streamingMessage}</p>
                <span className="text-green-200 animate-pulse">▋</span>
              </div>
            </div>
          )}
          {isLoading && !streamingMessage && <LoadingIcons.TailSpin />}
      </div>
      <div className="flex-shrink-0 relative">
          <textarea 
            ref={textareaRef}
            className="w-full p-2 pr-10 rounded border-2 focus:outline-none resize-none overflow-hidden min-h-[40px]" 
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
            className="absolute right-2 top-2 rounded"
            onClick={handleSendMessage}
          >
            <GoPaperAirplane />
          </button>
          <span className="absolute right-2 bottom-1 text-xs text-gray-400 italic">⌘+Enter to send</span>
        </div>
    </div>

  );
}

export default Chat;
