import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { BiLogOut } from "react-icons/bi";
import { FaTrash, FaHeart } from "react-icons/fa";
import { auth, db } from "../../../firebase";
import { useAppContext } from "@/context/AppContext";
import Favorites from "./Favorites";

type Room = {
  id: string;
  name: string;
  createdAt: Timestamp;
};

const Sidebar = () => {

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
    <div className="bg-custom-blue h-full overflow-y-auto px-5 flex flex-col">
      <div className="flex-grow">
        <div
          onClick={addRoom}
          className="cursor-pointer flex justify-evenly items-center border mt-2 rounded-md hover:bg-blue-800 duration-150">
          <span className="text-white p-4 text-2xl">+</span>
          <h1 className="text-white text-xl font-semibold p-4">New Chat</h1>
        </div>
        <div
          onClick={() => setShowFavorites(true)}
          className="cursor-pointer flex justify-evenly items-center border mt-2 rounded-md hover:bg-blue-800 duration-150">
          <FaHeart className="text-red-400 p-1 text-2xl" />
          <h1 className="text-white text-xl font-semibold p-4">お気に入り</h1>
        </div>
        <ul>
        {rooms.map((room) => (
          <li
            key={room.id}
            className="flex items-center justify-between border-b p-4 text-slate-100 hover:bg-slate-700 duration-150"
          >
            <span
              className="cursor-pointer flex-grow"
              onClick={() => selectRoom(room.id, room.name)}
            >
              {room.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteRoom(room.id, room.name);
              }}
              className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-slate-600"
            >
              <FaTrash size={14} />
            </button>
          </li>
        ))}
        </ul>
      </div>
      {user && (
        <div className="mb-2 p-4 text-slate-100 text-lg font-medium">
          {user.email}
        </div>
      )}
      <div
        onClick={() => handleLogout()}
        className="text-lg flex items-center justify-evenly mb-2 cursor-pointer p-4 text-slate-100 hover:bg-slate-700 duration-150">
        <BiLogOut />
        <span>logout</span>
      </div>
      <Favorites isOpen={showFavorites} onClose={() => setShowFavorites(false)} />
    </div>
  );
}

export default Sidebar;
