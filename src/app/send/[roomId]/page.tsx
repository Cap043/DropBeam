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
  const [isComplete, setIsComplete] = useState(false);
  const cancelRef = useRef(false);

  const resetSender = () => {
    setFile(null);
    setProgress(0);
    setIsWaiting(false);
    setIsComplete(false);
    cancelRef.current = false;
  };

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
          (pct) => {
            setProgress(pct);
            if (pct === 100) setIsComplete(true);
          }, 
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
    if (channel && channel.readyState === "open") {
      channel.send(JSON.stringify({ type: "CANCEL" }));
    }
    resetSender();
  };

  return (
    <div className="p-10 flex flex-col gap-4 max-w-md text-black">
      <h1 className="text-xl font-bold text-white">Sender</h1>
      <p className="text-white">Room Code: <strong className="text-blue-400">{resolvedParams.roomId}</strong></p>
      <p className="border p-2 bg-gray-100 rounded">Status: {status}</p>

      {channel && channel.readyState === "open" && (
        <div className="border p-4 bg-blue-50 rounded flex flex-col gap-4">
          {!file && (
            <input 
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              className="w-full" 
            />
          )}

          {file && !isWaiting && progress === 0 && (
            <div className="flex flex-col gap-2">
              <p>Selected: <strong>{file.name}</strong></p>
              <button onClick={handleSend} className="p-2 bg-blue-600 text-white rounded font-bold">
                Send File
              </button>
              <button onClick={resetSender} className="p-2 bg-gray-300 text-black rounded text-sm">
                Choose Different File
              </button>
            </div>
          )}

          {isWaiting && <p className="text-blue-700 font-semibold">Waiting for Receiver to accept...</p>}

          {progress > 0 && progress < 100 && (
            <div className="flex flex-col gap-2">
              <div>Transfer Progress: {progress}%</div>
              <button onClick={handleStop} className="p-2 bg-red-600 text-white rounded font-bold">
                Stop Transfer 🛑
              </button>
            </div>
          )}

          {isComplete && (
            <div className="flex flex-col gap-2">
              <div className="text-green-700 font-bold">Transfer Complete! 🎉</div>
              <button onClick={resetSender} className="p-2 bg-blue-600 text-white rounded font-bold">
                Send Another File
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}