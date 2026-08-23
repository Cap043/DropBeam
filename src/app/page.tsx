"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleSend = () => {
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    router.push(`/send/${roomId}`);
  };

  return (
    <div className="p-10 flex flex-col gap-4 max-w-sm">
      <h1 className="text-2xl font-bold">DropBeam Engine Test</h1>
      
      <button onClick={handleSend} className="p-2 bg-blue-500 text-white rounded">
        Generate Room (Sender)
      </button>
      
      <div className="border-t pt-4 mt-4">
        <input 
          type="text" 
          placeholder="Enter 6-digit code" 
          value={code} 
          onChange={(e) => setCode(e.target.value)}
          className="border p-2 w-full mb-2 text-black"
        />
        <button 
          onClick={() => router.push(`/receive/${code}`)}
          className="p-2 bg-green-500 text-white rounded w-full">
          Join Room (Receiver)
        </button>
      </div>
    </div>
  );
}