"use client";
import { useWebRTC } from "../../../hooks/useWebRTC";
import { sendFileChunks } from "../../../lib/webrtc/chunker";
import { use, useState, useRef } from "react";

export default function SendPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const { status, channel } = useWebRTC(resolvedParams.roomId, true);
  
  const [file, setFile] = useState<File | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);

  const handleSend = () => {
    if (!file || !channel) return;
    
    setIsWaiting(true);
    cancelRef.current = false;

    channel.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "accept") {
        setIsWaiting(false);
        sendFileChunks(
          channel, 
          file, 
          (pct) => setProgress(pct), 
          () => cancelRef.current
        );
      }
    };

    channel.send(JSON.stringify({
      type: "metadata",
      name: file.name,
      size: file.size,
      mime: file.type
    }));
  };

  const handleStop = () => {
    cancelRef.current = true;
    setIsWaiting(false);
    if (channel && channel.readyState === "open") {
      channel.send(JSON.stringify({ type: "CANCEL" }));
    }
    alert("Transfer stopped.");
  };

  return (
    <div className="p-10 flex flex-col gap-4 max-w-md">
      <h1 className="text-xl font-bold">Sender</h1>
      <p>Room Code: <strong className="text-blue-500">{resolvedParams.roomId}</strong></p>
      <p className="border p-2 bg-gray-100 text-black">Status: {status}</p>

      {channel && channel.readyState === "open" && (
        <div className="border p-4 bg-blue-50 flex flex-col gap-4 text-black">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full" />
          
          {file && progress === 0 && !isWaiting && (
            <button onClick={handleSend} className="p-2 bg-blue-600 text-white rounded">
              Send File
            </button>
          )}

          {isWaiting && <p className="text-blue-700 font-semibold">Waiting for Receiver to accept...</p>}

          {progress > 0 && progress < 100 && (
            <div className="flex flex-col gap-2">
              <div>Transfer Progress: {progress}%</div>
              <button onClick={handleStop} className="p-2 bg-red-600 text-white rounded">
                Stop Transfer 🛑
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}