"use client";

import React, { useEffect, useRef, useState } from "react";
import { GoPaperAirplane } from "react-icons/go";
import { db } from "../../../firebase";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from "firebase/firestore";
import { useAppContext } from "@/context/AppContext";
import LoadingIcons from 'react-loading-icons'

type Message = {
  text: string;
  sender: string;
  createdAt: Timestamp;
};

const Chat = () => {

  const { selectedRoom, selectRoomName } = useAppContext();
  const [inputMessage, setInputMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");

  const scrollDiv = useRef<HTMLDivElement>(null);

  // モデルの選択肢を配列で定義
  const modelOptions = [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" }
  ];

    // Retrieve messages for the selected room from Firestore
  useEffect(() => {
    if (selectedRoom) {
      const fetchMessages = async () => {
        const roomDocRef = doc(db, "rooms", selectedRoom);
        const messageCollectionRef = collection(roomDocRef, "messages");

        const q = query(messageCollectionRef, orderBy("createdAt"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const messages = snapshot.docs.map((doc) => doc.data() as Message);
          console.log(messages);
          setMessages(messages);
        });
        return () => {
          unsubscribe();
        }
      };
      fetchMessages();
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (scrollDiv.current) {
      const element = scrollDiv.current;
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const [isComposing, setComposition] = useState(false);
  const startComposition = () => setComposition(true);
  const endComposition = () => setComposition(false);

  const handleSendMessage = async () => {
    console.log(inputMessage);
    if (!inputMessage.trim()) {
      return;
    }
    const messageData = {
      text: inputMessage,
      sender: "user",
      createdAt: serverTimestamp(),
    };
    // Store message to Firestore
    const roomDocRef = doc(db, "rooms", selectedRoom!);
    const messageCollectionRef = collection(roomDocRef, "messages");
    await addDoc(messageCollectionRef, messageData);

    setInputMessage("");
    setIsLoading(true);

    // Reply from the bot
    const response = await fetch('/api/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        inputMessage,
        context: messages.map(message => ({
          text: message.text,
          sender: message.sender
        })),
        model: selectedModel
      }),
    });

    setIsLoading(false);

    // const botResponse = gpt3Response.choices[0].message.content;
    const data = await response.json();
    const botResponse = data.botResponse;
    console.log(botResponse);
    await addDoc(messageCollectionRef, {
      text: botResponse,
      sender: "bot",
      createdAt: serverTimestamp(),
    });
  }

  return (
    <div className="bg-gray-500 h-full flex flex-col p-4">
      <h1 className="text-2xl text-white font-semibold mb-4">{selectRoomName}</h1>
      <div className="mb-4">
        <label className="text-white mr-2">Select AI Model:</label>
        <select 
          value={selectedModel} 
          onChange={(e) => setSelectedModel(e.target.value)}
          className="p-2 rounded border-2"
        >
          {modelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div ref={scrollDiv} className="flex-grow overflow-y-auto mb-4">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={message.sender === "user" ? "text-right" : "text-left"}>
                <div
                  className={
                    message.sender === "user"
                      ? "bg-blue-500 inline-block rounded px-4 py-2 mb-2"
                    : "bg-green-500 inline-block rounded px-4 py-2 mb-2"
                  }
                >
                <p className="text-white">{message.text}</p>
              </div>
            </div>
          ))}
          {isLoading && <LoadingIcons.TailSpin />}
      </div>
      <div className="flex-shrink-0 relative">
          <input type="text" className="w-full p-2 pr-10 rounded border-2 focus:outline-none" placeholder="Type a message..."
            value={inputMessage}
            onCompositionStart={startComposition}
            onCompositionEnd={endComposition}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isComposing) {
                handleSendMessage();
              }
            }}
          />
          <button className="absolute right-2 flex items-center inset-y-0 rounded"
            onClick={() => handleSendMessage()}
          >
            <GoPaperAirplane />
          </button>
        </div>
    </div>

  );
}

export default Chat;
