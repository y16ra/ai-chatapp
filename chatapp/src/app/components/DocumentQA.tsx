"use client";

import React, { useState, useRef } from 'react';
import { HiMagnifyingGlass, HiDocumentText, HiXMark } from 'react-icons/hi2';
import { useAppContext } from '@/context/AppContext';

interface Source {
  filename: string;
  pageNumber?: number;
  similarity: number;
  preview: string;
}

interface DocumentQAProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionSubmit: (question: string) => void;
  isLoading: boolean;
  answer: string;
  sources: Source[];
}

const DocumentQA: React.FC<DocumentQAProps> = ({
  isOpen,
  onClose,
  onQuestionSubmit,
  isLoading,
  answer,
  sources
}) => {
  const [question, setQuestion] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isLoading) {
      onQuestionSubmit(question.trim());
      setQuestion('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="glass-morphism rounded-2xl w-full max-w-4xl mx-4 h-[80vh] flex flex-col shadow-glass animate-slide-up">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <HiDocumentText className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">
              ドキュメント Q&A
            </h2>
          </div>
          <button
            onClick={onClose}
            className="glass-button text-white/70 hover:text-white p-2 rounded-xl transition-all"
          >
            <HiXMark className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main QA Area */}
          <div className="flex-1 flex flex-col">
            {/* Answer Display */}
            <div className="flex-1 p-4 overflow-y-auto">
              {answer ? (
                <div className="glass-morphism rounded-xl p-4 border border-white/10">
                  <h3 className="text-sm font-medium text-white mb-2">
                    回答
                  </h3>
                  <div className="text-white/90 whitespace-pre-wrap">
                    {answer}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-white/60">
                  <div className="text-center">
                    <HiMagnifyingGlass className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>アップロードしたドキュメントについて質問してください</p>
                  </div>
                </div>
              )}
              
              {isLoading && (
                <div className="flex items-center space-x-2 mt-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-400"></div>
                  <span className="text-sm text-white/70">
                    回答を生成中...
                  </span>
                </div>
              )}
            </div>

            {/* Question Input */}
            <div className="p-4 border-t border-white/10">
              <form onSubmit={handleSubmit} className="relative">
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ドキュメントについて質問を入力してください..."
                  className="w-full p-3 pr-12 glass-button text-white placeholder-white/50 border-white/30 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
                  rows={3}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!question.trim() || isLoading}
                  className="absolute right-2 top-2 p-2 text-primary-400 hover:text-primary-300 disabled:text-white/40 disabled:cursor-not-allowed transition-all hover:scale-110"
                >
                  <HiMagnifyingGlass className="h-5 w-5" />
                </button>
              </form>
              <p className="text-xs text-white/50 mt-1">
                ⌘+Enter で送信
              </p>
            </div>
          </div>

          {/* Sources Sidebar */}
          {sources.length > 0 && (
            <div className="w-80 border-l border-white/10 p-4 overflow-y-auto">
              <h3 className="text-sm font-medium text-white mb-3">
                参照元 ({sources.length})
              </h3>
              <div className="space-y-3">
                {sources.map((source, index) => (
                  <div
                    key={index}
                    className="glass-morphism rounded-xl p-3 text-sm border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-1 flex-1 min-w-0">
                        <HiDocumentText className="h-4 w-4 text-white/70 flex-shrink-0" />
                        <span className="font-medium text-white truncate">
                          {source.filename}
                        </span>
                      </div>
                      <span className="text-xs text-white/60 ml-2 flex-shrink-0">
                        {Math.round(source.similarity * 100)}%
                      </span>
                    </div>
                    {source.pageNumber && (
                      <div className="text-xs text-white/60 mb-2">
                        ページ {source.pageNumber}
                      </div>
                    )}
                    <div className="text-white/80 text-xs leading-relaxed">
                      {source.preview}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentQA;
