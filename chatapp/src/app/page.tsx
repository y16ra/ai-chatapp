import Image from "next/image";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";

export default function Home() {
  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="text-4xl font-bold mb-4">Welcome to Chat App</div>
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
