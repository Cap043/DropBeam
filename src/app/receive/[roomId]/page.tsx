"use client";

import { useWebRTC } from "../../../hooks/useWebRTC";
import { receiveFileChunks } from "../../../lib/webrtc/assembler";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../components/ThemeProvider";

export default function ReceivePage({
  params
}: {
  params: Promise<{ roomId: string }>
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const { isDark, toggleTheme } = useTheme();

  const {
    status,
    channel,
    controlChannel,
    requestCancel,
    handleRemoteCancel
  } = useWebRTC(resolvedParams.roomId, false);

  const [incomingFile, setIncomingFile] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const resetReceiver = () => {
    setIncomingFile(null);
    setProgress(0);
    setIsDone(false);
  };

  const handleLeaveRoom = () => {
    if (controlChannel && controlChannel.readyState === "open") {
      try {
        controlChannel.send(JSON.stringify({ type: "CLOSE_ROOM" }));
      } catch (error) {
        console.warn("Failed to send CLOSE_ROOM command", error);
      }
    }
    requestCancel();
    router.push('/');
  };

  useEffect(() => {
    if (!channel) return;
    if (incomingFile) return;

    const handleMetadata = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;

      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "metadata") {
        setIncomingFile(msg);
        setProgress(0);
        setIsDone(false);
      }
    };

    channel.onmessage = handleMetadata;

    return () => {
      if (channel.onmessage === handleMetadata) {
        channel.onmessage = null;
      }
    };
  }, [channel, incomingFile]);
  
  useEffect(() => {
    if (!controlChannel) return;

    const handleControlMessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;

      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "CLOSE_ROOM") {
        console.log("[RECEIVER] 🛑 Sender closed the room.");
        router.push('/');
        return;
      }

      if (msg.type === "CANCEL") {
        console.log("[RECEIVER] 🛑 Sender cancelled transfer.");
        handleRemoteCancel();
        resetReceiver();
      }
    };

    controlChannel.addEventListener("message", handleControlMessage);
    return () => {
      controlChannel.removeEventListener("message", handleControlMessage);
    };
  }, [controlChannel, handleRemoteCancel, router]);

  const handleAccept = async () => {
    if (!channel || !incomingFile) return;

    let writable = null;
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: incomingFile.name
      });
      writable = await handle.createWritable();
    } catch (err) {
      console.warn("Save picker aborted. Using RAM fallback.");
    }

    if (channel.readyState !== "open") return;
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
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      },
      () => {
        resetReceiver();
      }
    );
  };

  const handleCancel = () => {
    console.log("[RECEIVER] 🛑 Local user cancelled/rejected transfer.");
    requestCancel();
    resetReceiver();
  };
  
  useEffect(() => {
    if (isDone) {
      const timer = setTimeout(() => {
        resetReceiver();
      }, 2500); 
      return () => clearTimeout(timer);
    }
  }, [isDone]);

  return (
    <div className={`relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden transition-colors duration-500 ${isDark ? 'bg-prussian-blue-950 text-prussian-blue-50' : 'bg-sand-dune-200 text-sand-dune-950'}`}>
      
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-3 rounded-full border transition-all duration-300 shadow-lg active:scale-95 z-50 ${
          isDark 
            ? 'bg-prussian-blue-800 border-prussian-blue-600/50 text-sand-dune-200 hover:bg-prussian-blue-700' 
            : 'bg-sand-dune-50 border-sand-dune-300 text-dusty-rose-600 hover:bg-sand-dune-100'
        }`}
      >
        {isDark ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        )}
      </button>

      {/* Leave Room Button */}
      <button 
        onClick={handleLeaveRoom}
        className={`absolute top-6 left-6 p-3 rounded-full border transition-all duration-300 shadow-lg active:scale-95 flex items-center gap-2 pr-5 z-50 ${
          isDark 
            ? 'bg-prussian-blue-800 border-prussian-blue-600/50 text-prussian-blue-200 hover:bg-wine-plum-900/80 hover:text-wine-plum-300 hover:border-wine-plum-700' 
            : 'bg-sand-dune-50 border-sand-dune-300 text-sand-dune-700 hover:bg-dusty-rose-100 hover:text-dusty-rose-700 hover:border-dusty-rose-300'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        <span className="font-semibold text-sm">Leave Room</span>
      </button>

      {/* STATE 1: WAITING ROOM */}
      {status !== "connected" && (
        <div className="flex flex-col items-center justify-center max-w-md w-full text-center z-10">
          <div className="relative flex items-center justify-center w-40 h-40 mb-12 mt-8">
            <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${isDark ? 'bg-light-cyan-500/30' : 'bg-frosted-mint-500/40'}`}></div>
            <div className={`absolute inset-4 rounded-full animate-pulse ${isDark ? 'bg-light-cyan-500/40' : 'bg-frosted-mint-500/50'}`}></div>
            <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.2)] ${isDark ? 'bg-light-cyan-500 text-light-cyan-50' : 'bg-frosted-mint-600 text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
          </div>
          <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-prussian-blue-50' : 'text-sand-dune-950'}`}>
            Connecting to Room
          </h2>
          <div className={`px-6 py-3 rounded-2xl tracking-widest text-3xl font-mono border shadow-lg mb-6 ${isDark ? 'bg-prussian-blue-900/80 border-light-cyan-500/50 text-light-cyan-400' : 'bg-sand-dune-50 border-frosted-mint-500/50 text-frosted-mint-800'}`}>
            {resolvedParams.roomId}
          </div>
          <p className={`text-sm ${isDark ? 'text-prussian-blue-300' : 'text-sand-dune-700'}`}>
            Establishing secure peer-to-peer connection...
          </p>
        </div>
      )}

      {/* STATE 2: CONNECTED (Dashboard) */}
      {status === "connected" && (
        <div className={`w-full max-w-xl p-8 rounded-3xl backdrop-blur-xl border z-10 shadow-2xl ${isDark ? 'bg-prussian-blue-900/80 border-prussian-blue-700' : 'bg-sand-dune-50/90 border-sand-dune-300'}`}>
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-inherit">
            <div>
              <h1 className="text-2xl font-bold">Transfer Dashboard</h1>
              <p className={`text-sm mt-1 flex items-center gap-2 ${isDark ? 'text-light-cyan-400' : 'text-frosted-mint-700'}`}>
                <span className="flex h-2 w-2 rounded-full bg-current shadow-[0_0_8px_currentColor]"></span>
                Connected to Sender
              </p>
            </div>
            <div className={`px-4 py-2 rounded-xl text-xl font-bold tracking-widest border ${isDark ? 'bg-prussian-blue-950 border-prussian-blue-700' : 'bg-sand-dune-200 border-sand-dune-400 text-sand-dune-900'}`}>
              {resolvedParams.roomId}
            </div>
          </div>

          {!incomingFile && (
            <div className={`p-10 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all duration-300 ${isDark ? 'border-prussian-blue-600/50 bg-prussian-blue-950/50' : 'border-sand-dune-300 bg-sand-dune-100/50'}`}>
              <div className="w-16 h-16 mb-4 rounded-full flex items-center justify-center animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDark ? 'text-light-cyan-400' : 'text-frosted-mint-700'}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-prussian-blue-50' : 'text-sand-dune-950'}`}>
                Waiting for file...
              </h3>
              <p className={`text-sm ${isDark ? 'text-prussian-blue-300' : 'text-sand-dune-700'}`}>
                The sender is selecting a file to transfer.
              </p>
            </div>
          )}

          {incomingFile && progress === 0 && !isDone && (
            <div className="flex flex-col gap-4 text-center">
              <div className={`p-6 rounded-2xl border ${isDark ? 'bg-prussian-blue-950 border-prussian-blue-700' : 'bg-sand-dune-100 border-sand-dune-300'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-light-cyan-500/20 text-light-cyan-400' : 'bg-frosted-mint-500/20 text-frosted-mint-700'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <p className="mb-1 text-sm uppercase tracking-wider font-semibold opacity-70">Incoming File</p>
                <p className="font-bold text-xl truncate px-4">{incomingFile.name}</p>
                <p className="text-sm opacity-70 mt-1">{(incomingFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleCancel}
                  className={`flex-1 p-4 rounded-xl font-bold transition-all active:scale-95 ${isDark ? 'bg-prussian-blue-800 hover:bg-wine-plum-800 text-prussian-blue-100' : 'bg-dusty-rose-200 hover:bg-dusty-rose-300 text-dusty-rose-800'}`}
                >
                  Reject
                </button>
                <button
                  onClick={handleAccept}
                  className={`flex-[2] p-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${isDark ? 'bg-light-cyan-600 hover:bg-light-cyan-500 text-prussian-blue-950' : 'bg-frosted-mint-600 hover:bg-frosted-mint-700 text-white'}`}
                >
                  Accept & Save
                </button>
              </div>
            </div>
          )}

          {progress > 0 && progress < 100 && (
            <div className="flex flex-col gap-6 mt-4 text-center">
              <div>
                <p className="mb-2 font-bold text-3xl">{progress}%</p>
                <div className={`w-full h-4 rounded-full overflow-hidden border ${isDark ? 'bg-prussian-blue-950 border-prussian-blue-700' : 'bg-sand-dune-200 border-sand-dune-300'}`}>
                  <div 
                    className={`h-full transition-all duration-300 ease-out ${isDark ? 'bg-light-cyan-500' : 'bg-frosted-mint-600'}`} 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <button
                onClick={handleCancel}
                className={`p-4 rounded-xl font-bold transition-all active:scale-95 ${isDark ? 'bg-wine-plum-700 hover:bg-wine-plum-600 text-white' : 'bg-dusty-rose-600 hover:bg-dusty-rose-700 text-white'}`}
              >
                Cancel Transfer 🛑
              </button>
            </div>
          )}

          {isDone && (
            <div className="flex flex-col gap-4 mt-4 text-center animate-in fade-in zoom-in duration-300">
              <div className={`p-8 rounded-2xl border ${isDark ? 'bg-frosted-mint-900/40 border-frosted-mint-800 text-frosted-mint-400' : 'bg-frosted-mint-100 border-frosted-mint-300 text-frosted-mint-800'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-frosted-mint-800/40' : 'bg-frosted-mint-200'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="font-extrabold text-2xl">Transfer Complete!</div>
                <p className="text-sm mt-2 opacity-80 text-current">File saved. Readying next transfer...</p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Ambient Background Glows */}
      <div className={`absolute top-[10%] left-[-10%] w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 z-0 ${isDark ? 'bg-prussian-blue-700/30' : 'bg-frosted-mint-200/60'}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 z-0 ${isDark ? 'bg-light-cyan-800/20' : 'bg-sand-dune-400/30'}`} />
    </div>
  );
}