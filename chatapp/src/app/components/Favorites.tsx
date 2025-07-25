"use client";

import React, { useEffect, useState } from "react";
import { FaHeart, FaTrash, FaTimes } from "react-icons/fa";
import { db } from "../../../firebase";
import { collection, onSnapshot, deleteDoc, doc, orderBy, query, Timestamp } from "firebase/firestore";
import { useAppContext } from "@/context/AppContext";

type Favorite = {
  id: string;
  messageId: string;
  roomId: string;
  messageText: string;
  createdAt: Timestamp;
};

type FavoritesProps = {
  isOpen: boolean;
  onClose: () => void;
};

const Favorites = ({ isOpen, onClose }: FavoritesProps) => {
  const { userId } = useAppContext();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // タイムスタンプをフォーマットする関数
  const formatTimestamp = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleString('ja-JP', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // お気に入り一覧を取得
  useEffect(() => {
    if (!userId || !isOpen) return;
    
    setIsLoading(true);
    const favoritesRef = collection(db, "users", userId, "favorites");
    const q = query(favoritesRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favoritesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as Favorite));
      setFavorites(favoritesList);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [userId, isOpen]);

  // お気に入りを削除
  const removeFavorite = async (favoriteId: string) => {
    if (!userId) return;
    
    try {
      await deleteDoc(doc(db, "users", userId, "favorites", favoriteId));
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  };

  // メッセージテキストを短縮表示
  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="glass-morphism rounded-2xl w-full max-w-4xl h-5/6 flex flex-col shadow-glass animate-slide-up">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FaHeart className="text-red-400" />
            <h2 className="text-xl font-semibold text-white">お気に入りメッセージ</h2>
          </div>
          <button
            onClick={onClose}
            className="glass-button text-white/70 hover:text-white p-2 rounded-xl transition-all"
          >
            <FaTimes />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-white/70">読み込み中...</div>
            </div>
          ) : favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/70">
              <FaHeart className="text-4xl mb-4 text-white/30" />
              <p>お気に入りメッセージがありません</p>
              <p className="text-sm mt-2">AIメッセージのハートボタンをクリックしてお気に入りに追加できます</p>
            </div>
          ) : (
            <div className="space-y-4">
              {favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="glass-morphism rounded-xl p-4 border border-white/10 hover:bg-white/5 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="bg-gradient-to-r from-green-500/80 to-emerald-500/80 text-white rounded-xl p-3 inline-block max-w-full backdrop-blur-sm">
                        <p className="whitespace-pre-wrap break-words">
                          {truncateText(favorite.messageText)}
                        </p>
                      </div>
                      <div className="text-xs text-white/50 mt-2">
                        {formatTimestamp(favorite.createdAt)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFavorite(favorite.id)}
                      className="glass-button text-red-400 hover:text-red-300 p-2 rounded-xl transition-all hover:scale-105"
                      title="お気に入りから削除"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Favorites;
