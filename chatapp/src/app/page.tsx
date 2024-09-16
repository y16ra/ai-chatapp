"use client";

import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import { useAppContext } from "@/context/AppContext";
import { useRouter } from "next/navigation";

export default function Home() {
  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="h-full flex" style={{ width: "1280px"}}>
        <div className="w-1/5 h-full border-r">
          <Sidebar />
        </div>
        <div className="w-4/5 h-full bg-blue-200">
          <Chat />
        </div>
      </div>
    </div>
  );
}
