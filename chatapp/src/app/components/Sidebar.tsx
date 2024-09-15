"use client";

import { addDoc, collection, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { BiLogOut } from "react-icons/bi";
import { auth, db } from "../../../firebase";
import { useAppContext } from "@/context/AppContext";

type Room = {
  id: string;
  name: string;
  createdAt: Timestamp;
};

const Sidebar = () => {

  const { user, userId, setSelectedRoom, setSelectRoomName } = useAppContext();

  const [rooms, setRooms] = useState<Room[]>([]);

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
        <ul>
        {rooms.map((room) => (
          <li
            key={room.id}
            className="cursor-pointer border-b p-4 text-slate-100 hover:bg-slate-700 duration-150 "
            onClick={() => selectRoom(room.id, room.name)}
          >
            {room.name}
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
    </div>
  );
}

export default Sidebar;
