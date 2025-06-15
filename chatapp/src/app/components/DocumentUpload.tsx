"use client";

import React, { useState, useRef } from 'react';
import { HiDocumentText, HiXMark, HiCloudArrowUp } from 'react-icons/hi2';
import { useAppContext } from '@/context/AppContext';

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface DocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (filename: string) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ 
  isOpen, 
  onClose, 
  onUploadComplete 
}) => {
  const { userId, selectedRoom } = useAppContext();
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || !userId || !selectedRoom) return;

    const validFiles = Array.from(files).filter(file => {
      const isPdf = file.type === 'application/pdf';
      const isMarkdown = file.name.endsWith('.md') || file.name.endsWith('.markdown');
      return isPdf || isMarkdown;
    });

    if (validFiles.length === 0) {
      alert('PDFまたはMarkdownファイルのみアップロード可能です。');
      return;
    }

    validFiles.forEach(file => uploadFile(file));
  };

  const uploadFile = async (file: File) => {
    // Initialize upload progress
    setUploads(prev => [...prev, {
      filename: file.name,
      progress: 0,
      status: 'uploading'
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId!);
      formData.append('roomId', selectedRoom!);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Update to processing status
      setUploads(prev => prev.map(upload => 
        upload.filename === file.name 
          ? { ...upload, progress: 50, status: 'processing' }
          : upload
      ));

      const result = await response.json();

      // Update to completed status
      setUploads(prev => prev.map(upload => 
        upload.filename === file.name 
          ? { ...upload, progress: 100, status: 'completed' }
          : upload
      ));

      onUploadComplete?.(file.name);

      // Remove from list after 3 seconds
      setTimeout(() => {
        setUploads(prev => prev.filter(upload => upload.filename !== file.name));
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploads(prev => prev.map(upload => 
        upload.filename === file.name 
          ? { 
              ...upload, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'アップロードに失敗しました'
            }
          : upload
      ));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
      case 'completed':
        return <div className="text-green-600">✓</div>;
      case 'error':
        return <div className="text-red-600">✗</div>;
    }
  };

  const getStatusText = (upload: UploadProgress) => {
    switch (upload.status) {
      case 'uploading':
        return 'アップロード中...';
      case 'processing':
        return 'ドキュメントを処理中...';
      case 'completed':
        return '完了';
      case 'error':
        return upload.error || 'エラー';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            ドキュメントアップロード
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <HiXMark className="h-6 w-6" />
          </button>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <HiCloudArrowUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            ファイルをドラッグ&ドロップ
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            または
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            ファイルを選択
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.md,.markdown"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            対応形式: PDF, Markdown (.md)
          </p>
        </div>

        {uploads.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              アップロード状況
            </h3>
            {uploads.map((upload, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <HiDocumentText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-900 dark:text-white truncate">
                      {upload.filename}
                    </span>
                  </div>
                  {getStatusIcon(upload.status)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        upload.status === 'error' 
                          ? 'bg-red-500' 
                          : upload.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${upload.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getStatusText(upload)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
