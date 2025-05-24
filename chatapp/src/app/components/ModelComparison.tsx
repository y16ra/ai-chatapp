"use client";

import React, { useState } from "react";
import { FaTimes, FaRedo, FaCheck } from "react-icons/fa";
import LoadingIcons from 'react-loading-icons';
import { getModelDisplayName, getModelProvider } from '@/constants/models';

export type ComparisonResult = {
  model: string;
  response: string;
  status: 'loading' | 'completed' | 'error';
  error?: string;
};

type ModelComparisonProps = {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  results: ComparisonResult[];
  onRegenerate: (models: string[]) => void;
};

const ModelComparison = ({ isOpen, onClose, question, results, onRegenerate }: ModelComparisonProps) => {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // レスポンスの文字数カウント
  const getResponseLength = (response: string) => {
    return response.length;
  };

  // 再生成
  const handleRegenerate = () => {
    if (selectedModels.length > 0) {
      onRegenerate(selectedModels);
      setSelectedModels([]);
    }
  };

  // モデル選択の切り替え
  const toggleModelSelection = (model: string) => {
    setSelectedModels(prev => 
      prev.includes(model) 
        ? prev.filter(m => m !== model)
        : [...prev, model]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl h-5/6 flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-800">AIモデル比較</h2>
            <p className="text-sm text-gray-600 mt-1 break-words">{question}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {selectedModels.length > 0 && (
              <button
                onClick={handleRegenerate}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded flex items-center gap-2"
              >
                <FaRedo className="text-sm" />
                再生成 ({selectedModels.length})
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((result) => (
              <div
                key={result.model}
                className={`border rounded-lg p-4 h-full flex flex-col ${
                  selectedModels.includes(result.model) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                {/* モデル情報 */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {getModelDisplayName(result.model)}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded ${
                      getModelProvider(result.model) === 'Claude' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {getModelProvider(result.model)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.status === 'completed' && (
                      <input
                        type="checkbox"
                        checked={selectedModels.includes(result.model)}
                        onChange={() => toggleModelSelection(result.model)}
                        className="w-4 h-4 text-blue-600"
                      />
                    )}
                    {result.status === 'completed' && (
                      <FaCheck className="text-green-500" />
                    )}
                  </div>
                </div>

                {/* ステータス別表示 */}
                <div className="flex-1 flex flex-col">
                  {result.status === 'loading' && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <LoadingIcons.TailSpin stroke="#6B7280" />
                        <p className="text-gray-500 mt-2">生成中...</p>
                      </div>
                    </div>
                  )}

                  {result.status === 'error' && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-red-500">
                        <p className="font-medium">エラーが発生しました</p>
                        <p className="text-sm mt-1">{result.error}</p>
                      </div>
                    </div>
                  )}

                  {result.status === 'completed' && (
                    <>
                      <div className="bg-gray-50 rounded p-3 flex-1 overflow-y-auto">
                        <p className="whitespace-pre-wrap text-sm text-gray-800 break-words">
                          {result.response}
                        </p>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {getResponseLength(result.response)} 文字
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelComparison;