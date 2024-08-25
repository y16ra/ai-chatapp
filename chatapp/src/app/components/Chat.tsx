import React from "react";
import { GoPaperAirplane } from "react-icons/go";

const Chat = () => {
  return (
    <div className="bg-gray-500 h-full flex flex-col p-4">
      <h1 className="text-2xl text-white font-semibold mb-4">Room 1</h1>
      <div className="flex-grow overflow-y-auto mb-4">
        <div className="text-right">
          <div className="bg-blue-500 inline-block rounded px-4 py-2">
            <p className="text-white font-medium">Hello</p>
          </div>
        </div>
        <div className="text-left">
          <div className="bg-green-500 inline-block rounded px-4 py-2">
            <p className="text-white font-medium">Hello</p>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 relative">
          <input type="text" className="w-full p-2 pr-10 rounded border-2 focus:outline-none" placeholder="Type a message..." />
          <button className="absolute right-2 flex items-center inset-y-0 rounded">
            <GoPaperAirplane />
          </button>
        </div>
    </div>

  );
}

export default Chat;
