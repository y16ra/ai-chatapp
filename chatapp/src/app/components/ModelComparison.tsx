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
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="glass-morphism rounded-2xl w-full max-w-7xl h-5/6 flex flex-col shadow-glass animate-slide-up">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-white">AIモデル比較</h2>
            <p className="text-sm text-white/70 mt-1 break-words">{question}</p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            {selectedModels.length > 0 && (
              <button
                onClick={handleRegenerate}
                className="glass-button text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <FaRedo className="text-sm" />
                再生成 ({selectedModels.length})
              </button>
            )}
            <button
              onClick={onClose}
              className="glass-button text-white/70 hover:text-white p-2 rounded-xl hover:scale-105 transition-all"
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
                className={`glass-morphism rounded-xl p-4 h-full flex flex-col transition-all duration-300 ${
                  selectedModels.includes(result.model) 
                    ? 'ring-2 ring-primary-400 bg-primary-500/20' 
                    : 'hover:bg-white/5'
                }`}
              >
                {/* モデル情報 */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">
                      {getModelDisplayName(result.model)}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      getModelProvider(result.model) === 'Claude' 
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30' 
                        : 'bg-green-500/20 text-green-300 border border-green-400/30'
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
                        className="w-4 h-4 text-primary-400 bg-white/10 border-white/30 rounded focus:ring-primary-400"
                      />
                    )}
                    {result.status === 'completed' && (
                      <FaCheck className="text-green-400" />
                    )}
                  </div>
                </div>

                {/* ステータス別表示 */}
                <div className="flex-1 flex flex-col">
                  {result.status === 'loading' && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <LoadingIcons.TailSpin stroke="#ffffff" />
                        <p className="text-white/70 mt-2">生成中...</p>
                      </div>
                    </div>
                  )}

                  {result.status === 'error' && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-red-400">
                        <p className="font-medium">エラーが発生しました</p>
                        <p className="text-sm mt-1">{result.error}</p>
                      </div>
                    </div>
                  )}

                  {result.status === 'completed' && (
                    <>
                      <div className="bg-white/5 rounded-lg p-3 flex-1 overflow-y-auto border border-white/10">
                        <p className="whitespace-pre-wrap text-sm text-white break-words">
                          {result.response}
                        </p>
                      </div>
                      <div className="mt-2 text-xs text-white/50">
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
