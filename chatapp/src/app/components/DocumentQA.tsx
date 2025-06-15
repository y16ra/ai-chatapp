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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <HiDocumentText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              ドキュメント Q&A
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    回答
                  </h3>
                  <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {answer}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <HiMagnifyingGlass className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>アップロードしたドキュメントについて質問してください</p>
                  </div>
                </div>
              )}
              
              {isLoading && (
                <div className="flex items-center space-x-2 mt-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    回答を生成中...
                  </span>
                </div>
              )}
            </div>

            {/* Question Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <form onSubmit={handleSubmit} className="relative">
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ドキュメントについて質問を入力してください..."
                  className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!question.trim() || isLoading}
                  className="absolute right-2 top-2 p-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <HiMagnifyingGlass className="h-5 w-5" />
                </button>
              </form>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ⌘+Enter で送信
              </p>
            </div>
          </div>

          {/* Sources Sidebar */}
          {sources.length > 0 && (
            <div className="w-80 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                参照元 ({sources.length})
              </h3>
              <div className="space-y-3">
                {sources.map((source, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-1 flex-1 min-w-0">
                        <HiDocumentText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {source.filename}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {Math.round(source.similarity * 100)}%
                      </span>
                    </div>
                    {source.pageNumber && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        ページ {source.pageNumber}
                      </div>
                    )}
                    <div className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
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
