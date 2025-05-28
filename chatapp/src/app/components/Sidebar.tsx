import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FaTrash, FaHeart } from "react-icons/fa";
import { HiPlus, HiChatBubbleLeft, HiUser, HiArrowRightOnRectangle } from "react-icons/hi2";
import { auth, db } from "../../../firebase";
import { useAppContext } from "@/context/AppContext";
import Favorites from "./Favorites";

type Room = {
  id: string;
  name: string;
  createdAt: Timestamp;
};

type SidebarProps = {
  onClose?: () => void;
};

const Sidebar = ({ onClose }: SidebarProps) => {

  const { user, userId, setSelectedRoom, setSelectRoomName, selectedRoom } = useAppContext();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [showFavorites, setShowFavorites] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      const fetchRooms = async () => {
        const roomCollection = collection(db, "rooms");
        const q = query(roomCollection, where("userId", "==", userId), orderBy("createdAt"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const rooms = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          console.log(rooms);
          setRooms(rooms as Room[]);
        });
        return () => {
          unsubscribe();
        }
        };
      fetchRooms();
    }

  }, [userId, user]);

  // Select a room
  const selectRoom = (roomId: string, roomName: string) => {
    console.log(roomId);
    setSelectedRoom(roomId);
    setSelectRoomName(roomName);
    // モバイルでルーム選択時にサイドバーを閉じる
    onClose?.();
  };

  // Add a new room
  const addRoom = async () => {
    const roomName = prompt("Enter room name");
    if (roomName) {
      const newRoomRef = collection(db, "rooms");
      await addDoc(newRoomRef, {
        name: roomName,
        createdAt: new Date(),
        userId: userId,
      });
    }
  };

  // Delete a room and its messages
  const deleteRoom = async (roomId: string, roomName: string) => {
    if (window.confirm(`Are you sure you want to delete "${roomName}"? All messages in this room will be permanently deleted.`)) {
      try {
        // Delete all messages in the room
        const roomRef = doc(db, "rooms", roomId);
        const messagesRef = collection(roomRef, "messages");
        const messagesSnapshot = await getDocs(messagesRef);
        const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // Delete the room document
        await deleteDoc(roomRef);

        // If the deleted room was selected, clear the selection
        if (selectedRoom === roomId) {
          setSelectedRoom(null);
          setSelectRoomName(null);
        }
      } catch (error) {
        console.error("Error deleting room:", error);
        alert("Failed to delete the room. Please try again.");
      }
    }
  };

  // Logout
  const handleLogout = () => {
    console.log("logout");
    auth.signOut();
  }

  return (
    <div className="bg-gradient-to-b from-slate-800 to-slate-700 h-full overflow-y-auto p-4 flex flex-col">
      <div className="flex-grow space-y-3">
        {/* Header Section */}
        <div className="bg-slate-700/50 backdrop-blur-sm rounded-xl p-3 border border-slate-600/50">
          <h2 className="text-white font-semibold text-lg flex items-center space-x-2">
            <HiChatBubbleLeft className="w-5 h-5 text-blue-400" />
            <span>Chats</span>
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={addRoom}
            className="w-full bg-slate-700/50 hover:bg-slate-600/60 backdrop-blur-sm rounded-lg p-3 border border-slate-600/50 transition-all duration-200 flex items-center space-x-3 group"
          >
            <div className="w-8 h-8 bg-blue-500 group-hover:bg-blue-400 rounded-lg flex items-center justify-center transition-colors">
              <HiPlus className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-medium">New Chat</span>
          </button>
          
          <button
            onClick={() => setShowFavorites(true)}
            className="w-full bg-slate-700/50 hover:bg-slate-600/60 backdrop-blur-sm rounded-lg p-3 border border-slate-600/50 transition-all duration-200 flex items-center space-x-3 group"
          >
            <div className="w-8 h-8 bg-red-500 group-hover:bg-red-400 rounded-lg flex items-center justify-center transition-colors">
              <FaHeart className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-medium">Favorites</span>
          </button>
        </div>

        {/* Room List */}
        <div className="bg-slate-700/50 backdrop-blur-sm rounded-xl border border-slate-600/50 overflow-hidden">
          <div className="p-3 border-b border-slate-600/50">
            <h3 className="text-slate-300 font-medium text-sm">Recent Rooms</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {rooms.length > 0 ? (
              <ul className="divide-y divide-slate-600/30">
                {rooms.map((room) => (
                  <li
                    key={room.id}
                    className={`flex items-center justify-between p-3 text-slate-100 hover:bg-slate-600/30 transition-colors duration-150 ${
                      selectedRoom === room.id ? 'bg-slate-600/50' : ''
                    }`}
                  >
                    <span
                      className="cursor-pointer flex-grow flex items-center space-x-2"
                      onClick={() => selectRoom(room.id, room.name)}
                    >
                      <HiChatBubbleLeft className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{room.name}</span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRoom(room.id, room.name);
                      }}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/20 transition-all ml-2 flex-shrink-0"
                      title="Delete room"
                    >
                      <FaTrash size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-slate-400">
                <HiChatBubbleLeft className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No rooms yet</p>
                <p className="text-xs">Create your first chat room</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="space-y-2 pt-3 border-t border-slate-600/50">
        {/* User Info */}
        {user && (
          <div className="bg-slate-700/50 backdrop-blur-sm rounded-lg p-3 border border-slate-600/50">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
                <HiUser className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{user.email}</p>
                <p className="text-slate-400 text-xs">Signed in</p>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={() => handleLogout()}
          className="w-full bg-slate-700/50 hover:bg-red-600/20 backdrop-blur-sm rounded-lg p-3 border border-slate-600/50 hover:border-red-500/30 transition-all duration-200 flex items-center space-x-3 group"
        >
          <div className="w-8 h-8 bg-slate-600 group-hover:bg-red-500 rounded-lg flex items-center justify-center transition-colors">
            <HiArrowRightOnRectangle className="w-4 h-4 text-slate-300 group-hover:text-white" />
          </div>
          <span className="text-slate-300 group-hover:text-white font-medium">Sign Out</span>
        </button>
      </div>

      <Favorites isOpen={showFavorites} onClose={() => setShowFavorites(false)} />
    </div>
  );
}

export default Sidebar;
