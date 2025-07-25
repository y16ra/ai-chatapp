"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { GoPaperAirplane } from "react-icons/go";
import { FaCheck, FaCheckDouble, FaRedo, FaHeart, FaRegHeart } from "react-icons/fa";
import { HiChatBubbleLeft, HiCog6Tooth, HiGlobeAlt, HiTrash, HiChartBarSquare, HiDocumentText, HiXMark } from "react-icons/hi2";
import { db } from "../../../firebase";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { useAppContext } from "@/context/AppContext";
import LoadingIcons from 'react-loading-icons';
import ModelComparison, { ComparisonResult } from './ModelComparison';
import DocumentUpload from './DocumentUpload';
import DocumentQA from './DocumentQA';
import { AI_MODELS, DEFAULT_COMPARISON_MODELS, getModelProvider, isClaudeModel, supportsWebSearch } from '@/constants/models';

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
  const [document, setDocument] = useState<File | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState<boolean>(false);
  const [showDocumentQA, setShowDocumentQA] = useState<boolean>(false);
  const [qaAnswer, setQaAnswer] = useState<string>("");
  const [qaSources, setQaSources] = useState<Array<{
    filename: string;
    pageNumber?: number;
    similarity: number;
    preview: string;
  }>>([]);
  const [qaLoading, setQaLoading] = useState<boolean>(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{
    filename: string;
    uploadedAt: string;
    fileSize?: number;
    pageCount?: number;
    chunkCount?: number;
  }>>([]);
  const [documentMode, setDocumentMode] = useState<boolean>(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());

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

  // アップロード済みドキュメントを取得する関数
  const fetchUploadedDocuments = useCallback(async () => {
    if (!userId || !selectedRoom) return;
    
    try {
      const response = await fetch('/api/documents/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, roomId: selectedRoom }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setUploadedDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [userId, selectedRoom]);

  // ドキュメント削除関数
  const deleteDocument = useCallback(async (filename: string) => {
    if (!userId || !selectedRoom) return;
    
    try {
      const response = await fetch('/api/documents/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, roomId: selectedRoom, filename }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Document deleted:', data);
        fetchUploadedDocuments(); // ドキュメント一覧を更新
        
        // ドキュメントが0個になったらドキュメントモードを無効化
        const updatedDocs = uploadedDocuments.filter(doc => doc.filename !== filename);
        if (updatedDocs.length === 0) {
          setDocumentMode(false);
          setSelectedDocuments(new Set());
        }
        
        // 削除されたファイルが選択されていた場合は選択から除外
        setSelectedDocuments(prev => {
          const newSet = new Set(prev);
          newSet.delete(filename);
          return newSet;
        });
      } else {
        const errorData = await response.json();
        console.error('Failed to delete document:', errorData);
        // TODO: エラー通知を表示
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      // TODO: エラー通知を表示
    }
  }, [userId, selectedRoom, fetchUploadedDocuments, uploadedDocuments]);

  // 初回ロード時・ルーム変更時にドキュメント一覧を取得
  useEffect(() => {
    if (userId && selectedRoom) {
      fetchUploadedDocuments();
      // ルーム変更時はドキュメントモードを無効化
      setDocumentMode(false);
      // 選択状態もリセット
      setSelectedDocuments(new Set());
    }
  }, [userId, selectedRoom, fetchUploadedDocuments]);

  // ドキュメント選択の処理
  const toggleDocumentSelection = (filename: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  };

  // 全選択/全解除の処理
  const toggleAllDocuments = () => {
    if (selectedDocuments.size === uploadedDocuments.length) {
      // 全選択されている場合は全解除
      setSelectedDocuments(new Set());
    } else {
      // そうでなければ全選択
      setSelectedDocuments(new Set(uploadedDocuments.map(doc => doc.filename)));
    }
  };

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

    // ドキュメントモードの場合はQA APIを使用
    if (documentMode && uploadedDocuments.length > 0) {
      try {
        const selectedFiles = selectedDocuments.size > 0 ? Array.from(selectedDocuments) : undefined;
        const response = await fetch('/api/documents/qa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: currentInput,
            userId: userId,
            roomId: selectedRoom,
            selectedFiles: selectedFiles,
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
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content') {
                  fullResponse += parsed.content;
                  setStreamingMessage(fullResponse);
                } else if (parsed.type === 'sources') {
                  // 参照元情報を表示用に保存
                  const sourcesText = parsed.sources.map((source: any, index: number) => 
                    `\n\n**参照 ${index + 1}:** ${source.filename}${source.pageNumber ? ` (ページ ${source.pageNumber})` : ''} (類似度: ${Math.round(source.similarity * 100)}%)\n${source.preview}`
                  ).join('');
                  fullResponse += sourcesText;
                  setStreamingMessage(fullResponse);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        // Store final response
        const botMessageData = {
          text: fullResponse,
          sender: "bot",
          createdAt: serverTimestamp(),
          isRead: false,
        };
        await addDoc(collection(doc(db, "rooms", selectedRoom!), "messages"), botMessageData);

      } catch (error) {
        console.error('Document QA error:', error);
        const errorMessage = "ドキュメントQAでエラーが発生しました。";
        const botMessageData = {
          text: errorMessage,
          sender: "bot",
          createdAt: serverTimestamp(),
          isRead: false,
        };
        await addDoc(collection(doc(db, "rooms", selectedRoom!), "messages"), botMessageData);
      }

      setIsLoading(false);
      setStreamingMessage("");
      return;
    }

    // 通常のチャット処理
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
          enableWebSearch: supportsWebSearch(selectedModel) ? enableWebSearch : false
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
          enableWebSearch: supportsWebSearch(selectedModel) ? enableWebSearch : false
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
            model: model,
            enableWebSearch: supportsWebSearch(model) ? enableWebSearch : false
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

  // QA機能のハンドラー
  const handleQuestionSubmit = async (question: string) => {
    if (!userId) return;
    
    setQaLoading(true);
    setQaAnswer("");
    setQaSources([]);

    try {
      const response = await fetch('/api/documents/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`QA request failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'content') {
                  setQaAnswer(prev => prev + data.content);
                } else if (data.type === 'sources') {
                  setQaSources(data.sources.map((source: any) => ({
                    filename: source.filename,
                    pageNumber: source.pageNumber,
                    similarity: source.similarity,
                    preview: source.preview
                  })));
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('QA error:', error);
      setQaAnswer('エラーが発生しました。もう一度お試しください。');
    } finally {
      setQaLoading(false);
    }
  };

  return (
    <div className="bg-gray-500 h-full flex flex-col">
      {/* 固定ヘッダー */}
      <div className="flex-none bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Room Info Section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <HiChatBubbleLeft className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-white">{selectRoomName || "New Chat"}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-lg text-sm border border-blue-500/30">
                {getCurrentAIProvider()}
              </span>
            </div>
          </div>

          {/* Compact Control Panel */}
          <div className="glass-morphism rounded-xl p-2 border border-white/10">
            <div className="flex items-center justify-between">
              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearChatHistory}
                  disabled={!selectedRoom || messages.length === 0}
                  className="glass-button bg-red-500/20 hover:bg-red-500/30 disabled:hover:bg-red-500/20 text-red-300 disabled:text-red-400 px-2 py-1 rounded-xl transition-all text-xs flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
                  title="Clear chat history"
                >
                  <HiTrash className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
                <button
                  onClick={() => {
                    if (inputMessage.trim()) {
                      compareModels(inputMessage, DEFAULT_COMPARISON_MODELS);
                    }
                  }}
                  disabled={!inputMessage.trim() || isLoading}
                  className="glass-button bg-purple-500/20 hover:bg-purple-500/30 disabled:hover:bg-purple-500/20 text-purple-300 disabled:text-purple-400 px-2 py-1 rounded-xl transition-all text-xs flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
                  title="Compare models"
                >
                  <HiChartBarSquare className="w-3 h-3" />
                  <span className="hidden sm:inline">Compare</span>
                </button>
              </div>

              {/* Status Info */}
              <div className="flex items-center space-x-3 text-xs">
                <div className="text-white/60">
                  {messages.length} messages
                </div>
                <div className={`px-2 py-0.5 rounded-xl text-xs ${isLoading ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                  {isLoading ? "Generating..." : "Ready"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* メッセージエリア */}
      <div ref={scrollDiv} className="flex-1 overflow-y-auto p-2 sm:p-4 pb-0 min-h-0">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`${message.sender === "user" ? "text-right" : "text-left"} animate-fade-in`}>
                <div
                  className={
                    message.sender === "user"
                    ? "bg-gradient-to-r from-primary-500/80 to-blue-500/80 inline-block rounded-xl px-3 sm:px-4 py-2 mb-2 whitespace-pre-wrap max-w-[280px] sm:max-w-xs md:max-w-md lg:max-w-lg backdrop-blur-sm"
                    : "glass-morphism inline-block rounded-xl px-3 sm:px-4 py-2 mb-2 whitespace-pre-wrap max-w-[280px] sm:max-w-xs md:max-w-md lg:max-w-lg"
                      }
                >
                <p className="text-white">{message.text}</p>
                <div className={`text-xs mt-1 flex items-center justify-between ${
                  message.sender === "user" ? "text-white/80" : "text-white/80"
                }`}>
                  <span>{formatTimestamp(message.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    {message.sender === "bot" && (
                      <button
                        onClick={() => toggleFavorite((message as any).id, message.text)}
                        className="hover:bg-white/20 p-1 rounded-xl transition-all hover:scale-110"
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
                        className="hover:bg-white/20 p-1 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110"
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
            <div className="text-left animate-fade-in">
              <div className="glass-morphism inline-block rounded-xl px-3 sm:px-4 py-2 mb-2 whitespace-pre-wrap max-w-[280px] sm:max-w-xs md:max-w-md lg:max-w-lg">
                <p className="text-white">{streamingMessage}</p>
                <span className="text-white/80 animate-pulse">▋</span>
                <div className="text-xs mt-1 flex items-center justify-between text-white/80">
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
      <div className="flex-none glass-morphism border-t border-white/10 shadow-glass">
        {/* Message Input */}
        <div className="p-2 sm:p-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              className="w-full p-2 sm:p-3 pr-12 sm:pr-14 rounded-xl border-2 border-white/30 glass-button text-white placeholder-white/50 focus:outline-none focus:border-primary-400 resize-none overflow-hidden min-h-[40px] text-sm sm:text-base"
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
              className="absolute right-2 sm:right-3 top-2 sm:top-3 rounded-xl p-1 glass-button text-white hover:scale-110 transition-transform"
              onClick={handleSendMessage}
            >
              <GoPaperAirplane className="text-sm sm:text-base" />
            </button>
            <span className="absolute right-2 sm:right-3 bottom-1 text-xs text-white/50 italic">⌘+Enter to send</span>
          </div>
        </div>

        {/* Compact Model Selection & Controls */}
        <div className="px-2 sm:px-4 pb-1">
          <div className="glass-morphism rounded-xl p-2 border border-white/10">
            <div className="flex items-center justify-between space-x-3">
              {/* Model Selection */}
              <div className="flex items-center space-x-2 flex-1">
                <HiCog6Tooth className="w-3 h-3 text-white/60 flex-shrink-0" />
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    // Claudeモデル以外の場合はWeb検索を無効化
                    if (!supportsWebSearch(e.target.value)) {
                      setEnableWebSearch(false);
                    }
                  }}
                  className="flex-1 glass-button text-white rounded-xl px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all text-xs appearance-none cursor-pointer"
                >
                  {AI_MODELS.map((model) => (
                    <option key={model.value} value={model.value} className="bg-slate-800 text-white">
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Web Search Toggle */}
              <div className="flex items-center space-x-2">
                <HiGlobeAlt className="w-3 h-3 text-white/60 flex-shrink-0" />
                {supportsWebSearch(selectedModel) ? (
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={enableWebSearch}
                        onChange={(e) => setEnableWebSearch(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-6 h-3 rounded-full transition-colors ${enableWebSearch ? 'bg-primary-500' : 'bg-white/20'}`}></div>
                      <div className={`absolute left-0.5 top-0.5 w-2 h-2 bg-white rounded-full transition-transform ${enableWebSearch ? 'translate-x-3' : 'translate-x-0'}`}></div>
                    </div>
                    <span className="ml-1 text-xs text-white/80 hidden sm:inline">
                      {enableWebSearch ? 'Web' : 'Off'}
                    </span>
                  </label>
                ) : (
                  <span className="text-xs text-white/40">—</span>
                )}
              </div>
              {/* Document Upload Button */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowDocumentUpload(true)}
                  className="flex items-center space-x-1 text-white/60 hover:text-white transition-all hover:scale-110"
                  title="ドキュメントアップロード"
                >
                  <HiDocumentText className="w-3 h-3" />
                  <span className="text-xs hidden sm:inline">Upload</span>
                </button>
              </div>

              {/* Document Mode Toggle */}
              {uploadedDocuments.length > 0 && (
                <div className="flex items-center space-x-2">
                  <HiDocumentText className="w-3 h-3 text-white/60 flex-shrink-0" />
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={documentMode}
                        onChange={(e) => setDocumentMode(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-6 h-3 rounded-full transition-colors ${documentMode ? 'bg-green-500' : 'bg-white/20'}`}></div>
                      <div className={`absolute left-0.5 top-0.5 w-2 h-2 bg-white rounded-full transition-transform ${documentMode ? 'translate-x-3' : 'translate-x-0'}`}></div>
                    </div>
                    <span className="ml-1 text-xs text-white/80 hidden sm:inline">
                      {documentMode ? 'Doc' : 'Chat'}
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Uploaded Documents Display */}
          {uploadedDocuments.length > 0 && (
            <div className="mt-3 glass-morphism rounded-xl p-2 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-white flex items-center space-x-1">
                  <HiDocumentText className="w-3 h-3" />
                  <span>アップロード済みドキュメント ({uploadedDocuments.length})</span>
                </h3>
                <div className="flex items-center space-x-2">
                  {documentMode && (
                    <>
                      <button
                        onClick={toggleAllDocuments}
                        className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                        title={selectedDocuments.size === uploadedDocuments.length ? "全解除" : "全選択"}
                      >
                        {selectedDocuments.size === uploadedDocuments.length ? "全解除" : "全選択"}
                      </button>
                      <span className="text-xs text-white/40">|
                      </span>
                      <span className="text-xs text-primary-400">
                        {selectedDocuments.size > 0 ? `${selectedDocuments.size}個選択中` : "全て検索"}
                      </span>
                    </>
                  )}
                  {documentMode && (
                    <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                      ドキュメントQAモード
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {uploadedDocuments.map((doc, index) => (
                  <div
                    key={index}
                    className={`glass-button text-white px-2 py-1 rounded-xl text-xs flex items-center space-x-1 max-w-xs group transition-all ${
                      documentMode && selectedDocuments.has(doc.filename) 
                        ? 'ring-2 ring-primary-400 bg-primary-500/20' 
                        : ''
                    }`}
                  >
                    {documentMode && (
                      <input
                        type="checkbox"
                        checked={selectedDocuments.has(doc.filename)}
                        onChange={() => toggleDocumentSelection(doc.filename)}
                        className="w-3 h-3 rounded border-white/30 text-primary-500 focus:ring-primary-500 focus:ring-1"
                        title="検索対象に含める/除外する"
                      />
                    )}
                    <HiDocumentText className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{doc.filename}</span>
                    {doc.chunkCount && (
                      <span className="text-white/60">({doc.chunkCount}chunks)</span>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(`「${doc.filename}」を削除しますか？この操作は取り消せません。`)) {
                          deleteDocument(doc.filename);
                        }
                      }}
                      className="ml-1 text-white/60 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                      title="ドキュメントを削除"
                    >
                      <HiXMark className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <ModelComparison
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        question={comparisonQuestion}
        results={comparisonResults}
        onRegenerate={handleComparisonRegenerate}
      />

      <DocumentUpload
        isOpen={showDocumentUpload}
        onClose={() => setShowDocumentUpload(false)}
        onUploadComplete={(filename: string) => {
          console.log(`Document uploaded: ${filename}`);
          fetchUploadedDocuments(); // ドキュメント一覧を更新
        }}
      />

      <DocumentQA
        isOpen={showDocumentQA}
        onClose={() => setShowDocumentQA(false)}
        onQuestionSubmit={handleQuestionSubmit}
        isLoading={qaLoading}
        answer={qaAnswer}
        sources={qaSources}
      />
    </div>

  );
}

export default Chat;
