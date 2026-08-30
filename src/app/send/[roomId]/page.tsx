"use client";

import { useWebRTC } from "../../../hooks/useWebRTC";
import { sendFileChunks } from "../../../lib/webrtc/chunker";
import FileDropzone from "../../../components/FileDropzone";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../components/ThemeProvider";

export default function SendPage({
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
  } = useWebRTC(resolvedParams.roomId, true);

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

  const handleCloseRoom = () => {
    if (controlChannel && controlChannel.readyState === "open") {
      try {
        controlChannel.send(JSON.stringify({ type: "CLOSE_ROOM" }));
      } catch (error) {
        console.warn("Failed to send CLOSE_ROOM command", error);
      }
    }
    cancelRef.current = true;
    requestCancel();
    router.push('/');
  };

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

      if (msg.type === "CANCEL") {
        console.log("[SENDER] 🛑 Receiver cancelled transfer.");
        cancelRef.current = true;
        handleRemoteCancel();
        resetSender();
      }
    };

    controlChannel.addEventListener("message", handleControlMessage);
    return () => {
      controlChannel.removeEventListener("message", handleControlMessage);
    };
  }, [controlChannel, handleRemoteCancel]);

  const handleSend = () => {
    if (!file || !channel || channel.readyState !== "open") return;
    if (!controlChannel || controlChannel.readyState !== "open") return;

    setIsWaiting(true);
    cancelRef.current = false;

    channel.onmessage = async (event) => {
      if (typeof event.data !== "string") return;

      let msg: any;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "accept") {
        setIsWaiting(false);
        try {
          await sendFileChunks(
            channel,
            file,
            (pct) => {
              setProgress(pct);
              if (pct === 100) setIsComplete(true);
            },
            () => cancelRef.current
          );
        } catch (error) {
          console.error("[SENDER] Transfer error:", error);
          cancelRef.current = true;
          resetSender();
        }
      }
    };

    channel.send(
      JSON.stringify({
        type: "metadata",
        name: file.name,
        size: file.size,
        mime: file.type
      })
    );
  };

  const handleStop = () => {
    console.log("[SENDER] 🛑 Local user cancelled transfer.");
    cancelRef.current = true;
    requestCancel();
    resetSender();
  };

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        resetSender();
      }, 2500); 
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

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

      {/* Close Room Button */}
      <button 
        onClick={handleCloseRoom}
        className={`absolute top-6 left-6 p-3 rounded-full border transition-all duration-300 shadow-lg active:scale-95 flex items-center gap-2 pr-5 z-50 ${
          isDark 
            ? 'bg-prussian-blue-800 border-prussian-blue-600/50 text-prussian-blue-200 hover:bg-wine-plum-900/80 hover:text-wine-plum-300 hover:border-wine-plum-700' 
            : 'bg-sand-dune-50 border-sand-dune-300 text-sand-dune-700 hover:bg-dusty-rose-100 hover:text-dusty-rose-700 hover:border-dusty-rose-300'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        <span className="font-semibold text-sm">Close Room</span>
      </button>

      {/* STATE 1: WAITING ROOM */}
      {status !== "connected" && (
        <div className="flex flex-col items-center justify-center max-w-md w-full text-center z-10">
          <div className="relative flex items-center justify-center w-40 h-40 mb-12 mt-8">
            <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${isDark ? 'bg-light-cyan-500/30' : 'bg-wine-plum-500/20'}`}></div>
            <div className={`absolute inset-4 rounded-full animate-pulse ${isDark ? 'bg-light-cyan-500/40' : 'bg-wine-plum-500/30'}`}></div>
            <div className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.2)] ${isDark ? 'bg-light-cyan-500 text-light-cyan-50' : 'bg-wine-plum-500 text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m19.07 19.07-1.41-1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            </div>
          </div>
          <h2 className={`text-4xl font-extrabold tracking-widest mb-4 ${isDark ? 'text-prussian-blue-50' : 'text-sand-dune-950'}`}>
            {resolvedParams.roomId}
          </h2>
          <p className={`text-lg font-medium mb-2 ${isDark ? 'text-light-cyan-400' : 'text-wine-plum-700'}`}>
            Broadcasting Room...
          </p>
          <p className={`text-sm ${isDark ? 'text-prussian-blue-300' : 'text-sand-dune-700'}`}>
            Ask the receiver to enter this 6-digit code on their device to join the transfer room.
          </p>
        </div>
      )}

      {/* STATE 2: CONNECTED (Dashboard) */}
      {status === "connected" && (
        <div className={`w-full max-w-xl p-8 rounded-3xl backdrop-blur-xl border z-10 shadow-2xl ${isDark ? 'bg-prussian-blue-900/80 border-prussian-blue-700' : 'bg-sand-dune-50/90 border-sand-dune-300'}`}>
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-inherit">
            <div>
              <h1 className="text-2xl font-bold">Transfer Dashboard</h1>
              <p className={`text-sm mt-1 flex items-center gap-2 ${isDark ? 'text-light-cyan-400' : 'text-wine-plum-600'}`}>
                <span className="flex h-2 w-2 rounded-full bg-current shadow-[0_0_8px_currentColor]"></span>
                Peer securely connected
              </p>
            </div>
            <div className={`px-4 py-2 rounded-xl text-xl font-bold tracking-widest border ${isDark ? 'bg-prussian-blue-950 border-prussian-blue-700' : 'bg-sand-dune-200 border-sand-dune-400 text-sand-dune-900'}`}>
              {resolvedParams.roomId}
            </div>
          </div>

          {!file && (
            <FileDropzone onFileSelect={setFile} isDark={isDark} />
          )}

          {file && !isWaiting && progress === 0 && (
            <div className="flex flex-col gap-4 text-center">
              <div className={`p-6 rounded-2xl border ${isDark ? 'bg-prussian-blue-950 border-prussian-blue-700' : 'bg-sand-dune-100 border-sand-dune-300'}`}>
                <p className="mb-2 text-sm uppercase tracking-wider font-semibold opacity-70">Selected File</p>
                <p className="font-bold text-xl truncate px-4">{file.name}</p>
                <p className="text-sm opacity-70 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={resetSender}
                  className={`flex-1 p-4 rounded-xl font-bold transition-all active:scale-95 ${isDark ? 'bg-prussian-blue-800 hover:bg-prussian-blue-700 text-prussian-blue-100' : 'bg-sand-dune-200 hover:bg-sand-dune-300 text-sand-dune-900'}`}
                >
                  Change File
                </button>
                <button
                  onClick={handleSend}
                  className={`flex-[2] p-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg ${isDark ? 'bg-baby-blue-ice-500 hover:bg-baby-blue-ice-600 text-baby-blue-ice-50' : 'bg-wine-plum-600 hover:bg-wine-plum-700 text-white'}`}
                >
                  Start Transfer
                </button>
              </div>
            </div>
          )}

          {isWaiting && (
            <div className="text-center py-10 animate-pulse">
              <p className={`font-semibold text-lg ${isDark ? 'text-light-cyan-400' : 'text-wine-plum-700'}`}>
                Waiting for Receiver to accept...
              </p>
            </div>
          )}

          {progress > 0 && progress < 100 && (
            <div className="flex flex-col gap-6 mt-4 text-center">
              <div>
                <p className="mb-2 font-bold text-3xl">{progress}%</p>
                <div className={`w-full h-4 rounded-full overflow-hidden border ${isDark ? 'bg-prussian-blue-950 border-prussian-blue-700' : 'bg-sand-dune-200 border-sand-dune-300'}`}>
                  <div 
                    className={`h-full transition-all duration-300 ease-out ${isDark ? 'bg-baby-blue-ice-500' : 'bg-wine-plum-600'}`} 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <button
                onClick={handleStop}
                className={`p-4 rounded-xl font-bold transition-all active:scale-95 ${isDark ? 'bg-wine-plum-700 hover:bg-wine-plum-600 text-white' : 'bg-dusty-rose-600 hover:bg-dusty-rose-700 text-white'}`}
              >
                Stop Transfer 🛑
              </button>
            </div>
          )}

          {isComplete && (
            <div className="flex flex-col gap-4 mt-4 text-center animate-in fade-in zoom-in duration-300">
              <div className={`p-8 rounded-2xl border ${isDark ? 'bg-frosted-mint-900/40 border-frosted-mint-800 text-frosted-mint-400' : 'bg-frosted-mint-100 border-frosted-mint-300 text-frosted-mint-800'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-frosted-mint-800/40' : 'bg-frosted-mint-200'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="font-extrabold text-2xl">Transfer Complete!</div>
                <p className="text-sm mt-2 opacity-80 text-current animate-pulse">Readying next transfer...</p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Ambient Background Glows */}
      <div className={`absolute top-[10%] left-[-10%] w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 z-0 ${isDark ? 'bg-prussian-blue-700/30' : 'bg-wine-plum-200/50'}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 z-0 ${isDark ? 'bg-light-cyan-800/20' : 'bg-frosted-mint-200/50'}`} />
    </div>
  );
}