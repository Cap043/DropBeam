"use client";
import { useWebRTC } from "../../../hooks/useWebRTC";
import { receiveFileChunks } from "../../../lib/webrtc/assembler";
import { use, useEffect, useState } from "react";

export default function ReceivePage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const { status, channel } = useWebRTC(resolvedParams.roomId, false);
  
  const [incomingFile, setIncomingFile] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!channel) return;
    channel.onmessage = (event) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        if (msg.type === "metadata") setIncomingFile(msg);
      }
    };
  }, [channel]);

  const handleAccept = async () => {
    if (!channel || !incomingFile) return;

    let writable = null;
    try {
      const handle = await (window as any).showSaveFilePicker({ suggestedName: incomingFile.name });
      writable = await handle.createWritable();
    } catch (err) {
      console.warn("Save picker aborted. Using RAM fallback.");
    }

    channel.send(JSON.stringify({ type: "accept" }));

    receiveFileChunks(
      channel, 
      incomingFile.size, 
      incomingFile.mime, 
      writable, 
      (pct) => setProgress(pct),
      (fallbackBlob) => {
        setIsDone(true);
        if (fallbackBlob) {
          const url = URL.createObjectURL(fallbackBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = incomingFile.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      },
      () => {
        alert("Transfer was cancelled.");
        setProgress(0);
        setIncomingFile(null);
      }
    );
  };

  const handleCancel = () => {
    if (channel && channel.readyState === "open") {
      channel.send(JSON.stringify({ type: "CANCEL" }));
    }
    setProgress(0);
    setIncomingFile(null);
  };

  return (
    <div className="p-10 flex flex-col gap-4 max-w-md">
      <h1 className="text-xl font-bold">Receiver</h1>
      <p>Joined Room: <strong>{resolvedParams.roomId}</strong></p>
      <p className="border p-2 bg-gray-100 text-black">Status: {status}</p>

      {incomingFile && progress === 0 && (
        <div className="border p-4 bg-yellow-50 text-black flex flex-col gap-3">
          <p><strong>Incoming File:</strong> {incomingFile.name}</p>
          <p><strong>Size:</strong> {(incomingFile.size / (1024 * 1024)).toFixed(2)} MB</p>
          
          <div className="flex gap-2">
            <button onClick={handleAccept} className="p-2 bg-green-600 text-white rounded flex-1">
              Accept & Save
            </button>
            <button onClick={handleCancel} className="p-2 bg-red-600 text-white rounded">
              Reject
            </button>
          </div>
        </div>
      )}

      {progress > 0 && progress < 100 && (
        <div className="border p-4 bg-green-50 text-black flex flex-col gap-3">
          <div>Receiving: {progress}%</div>
          <button onClick={handleCancel} className="p-2 bg-red-600 text-white rounded">
            Cancel Transfer 🛑
          </button>
        </div>
      )}

      {isDone && (
        <div className="border p-4 bg-green-50 text-black font-bold">
          Transfer Complete! 🎉
        </div>
      )}
    </div>
  );
}