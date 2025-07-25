"use client";

import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex relative">
      {/* モバイル用サイドバーオーバーレイ */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* サイドバー */}
      <nav 
        className={`
          fixed lg:static inset-y-0 left-0 z-50 
          w-80 lg:w-1/4 xl:w-1/5 
          transform transition-transform duration-300 ease-in-out
          lg:transform-none lg:transition-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          border-r
        `}
        aria-label="メインナビゲーション"
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </nav>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* モバイル用ヘッダー */}
        <div className="lg:hidden glass-morphism text-white p-4 flex items-center justify-between shadow-glass">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="glass-button text-white p-2 rounded-xl hover:scale-105 transition-transform"
            aria-label={isSidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
            aria-expanded={isSidebarOpen}
          >
            <FaBars size={20} />
          </button>
          <h1 className="text-lg font-semibold">AI Chat</h1>
          <div className="w-8" />
        </div>

        {/* チャットエリア */}
        <div className="flex-1 min-h-0">
          <Chat />
        </div>
      </div>
    </div>
  );
}
