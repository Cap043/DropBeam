"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../components/ThemeProvider";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const { isDark, toggleTheme } = useTheme();

  const handleSend = () => {
    const roomId = Math.floor(100000 + Math.random() * 900000).toString();
    router.push(`/send/${roomId}`);
  };

  return (
    <div className={`relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden transition-colors duration-500 ${isDark ? 'bg-prussian-blue-950 text-prussian-blue-50' : 'bg-bone-100 text-bone-950'}`}>
      
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-3 rounded-full border transition-all duration-300 shadow-lg active:scale-95 ${
          isDark 
            ? 'bg-prussian-blue-800 border-prussian-blue-600/50 text-sand-dune-200 hover:bg-prussian-blue-700' 
            : 'bg-bone-200 border-bone-200 text-dusty-rose-500 hover:bg-bone-100'
        }`}
      >
        {isDark ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        )}
      </button>

      {/* Ambient Background Glows */}
      <div className={`absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${isDark ? 'bg-prussian-blue-700/40' : 'bg-wine-plum-200/60'}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${isDark ? 'bg-light-cyan-800/30' : 'bg-frosted-mint-200/60'}`} />

      {/* Hero Section */}
      <div className="relative z-10 text-center max-w-3xl mb-16 flex flex-col items-center">
        <div className={`mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium backdrop-blur-md ${isDark ? 'bg-white/5 border-white/10 text-prussian-blue-200' : 'bg-bone-200/60 border-bone-300 text-wine-plum-600'}`}>
          <span className={`flex h-2 w-2 rounded-full ${isDark ? 'bg-light-cyan-500 shadow-[0_0_8px_rgba(0,217,255,0.8)]' : 'bg-wine-plum-500 shadow-[0_0_8px_rgba(171,84,96,0.6)]'}`}></span>
          Direct Peer-to-Peer Transfer
        </div>
        
        <h1 className={`text-6xl md:text-7xl font-extrabold tracking-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b drop-shadow-sm transition-colors duration-500 ${isDark ? 'from-prussian-blue-50 to-prussian-blue-300' : 'from-wine-plum-950 to-wine-plum-700'}`}>
          DropBeam
        </h1>
        
        <p className={`text-lg md:text-xl max-w-xl leading-relaxed transition-colors duration-500 ${isDark ? 'text-prussian-blue-300' : 'text-bone-600'}`}>
          Share files of any size instantly. No servers, no limits, just pure device-to-device speed.
        </p>
      </div>

      {/* Action Dashboard */}
      <div className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 gap-6">
        
        {/* Sender Card */}
        <div className={`group relative p-8 rounded-3xl backdrop-blur-xl transition-all duration-500 flex flex-col justify-between overflow-hidden border ${isDark ? 'bg-prussian-blue-800/50 border-prussian-blue-600/30 hover:bg-prussian-blue-800/70 hover:border-baby-blue-ice-400/50 shadow-2xl' : 'bg-bone-200/40 border-bone-300 hover:bg-bone-200/80 hover:border-wine-plum-400/50 shadow-xl'}`}>
          <div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${isDark ? 'bg-prussian-blue-700/50 border-prussian-blue-500/30 text-baby-blue-ice-400' : 'bg-wine-plum-50/50 border-wine-plum-100 text-wine-plum-500'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <h2 className="text-3xl font-bold mb-3">Send a File</h2>
            <p className={`text-sm leading-relaxed mb-8 ${isDark ? 'text-prussian-blue-200' : 'text-bone-700'}`}>
              Generate a secure, temporary room. Drag and drop your files to stream them at maximum Wi-Fi speed.
            </p>
          </div>

          <button 
            onClick={handleSend} 
            className={`w-full font-bold text-lg py-4 px-6 rounded-2xl transition-all duration-300 active:scale-[0.98] shadow-lg ${isDark ? 'bg-baby-blue-ice-500 hover:bg-baby-blue-ice-600 text-baby-blue-ice-50 shadow-[0_0_30px_rgba(0,89,255,0.2)]' : 'bg-wine-plum-500 hover:bg-wine-plum-600 text-white shadow-[0_4px_20px_rgba(171,84,96,0.2)]'}`}
          >
            Generate Room
          </button>
        </div>

        {/* Receiver Card */}
        <div className={`group relative p-8 rounded-3xl backdrop-blur-xl transition-all duration-500 flex flex-col justify-between overflow-hidden border ${isDark ? 'bg-prussian-blue-800/50 border-prussian-blue-600/30 hover:bg-prussian-blue-800/70 hover:border-light-cyan-500/40 shadow-2xl' : 'bg-bone-200/40 border-bone-300 hover:bg-bone-200/80 hover:border-frosted-mint-600/50 shadow-xl'}`}>
          <div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border ${isDark ? 'bg-light-cyan-800/50 border-light-cyan-700/30 text-light-cyan-500' : 'bg-frosted-mint-100/50 border-frosted-mint-200 text-frosted-mint-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            </div>
            <h2 className="text-3xl font-bold mb-3">Receive a File</h2>
            <p className={`text-sm leading-relaxed mb-8 ${isDark ? 'text-prussian-blue-200' : 'text-bone-700'}`}>
              Waiting for a file? Enter the 6-digit connection code from the sender's screen to securely join the room.
            </p>
          </div>

          <div className={`relative flex items-center border rounded-2xl p-1.5 transition-all duration-300 ${isDark ? 'bg-prussian-blue-900/80 border-prussian-blue-700 focus-within:border-light-cyan-500/60 focus-within:ring-1 focus-within:ring-light-cyan-500/50' : 'bg-bone-100/80 border-bone-300 focus-within:border-frosted-mint-600/60 focus-within:ring-1 focus-within:ring-frosted-mint-600/50'}`}>
            <input 
              type="text" 
              placeholder="000000" 
              maxLength={6}
              value={code} 
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} 
              className={`w-full bg-transparent text-center text-3xl tracking-[0.3em] font-mono outline-none py-3 pl-4 ${isDark ? 'text-light-cyan-50 placeholder:text-prussian-blue-700' : 'text-bone-950 placeholder:text-bone-400'}`}
            />
            <button 
              onClick={() => code.length === 6 && router.push(`/receive/${code}`)}
              disabled={code.length !== 6}
              className={`absolute right-1.5 font-bold py-3 px-6 rounded-xl transition-all duration-300 active:scale-[0.96] ${isDark ? 'bg-light-cyan-600 hover:bg-light-cyan-700 disabled:bg-prussian-blue-800 disabled:text-prussian-blue-600 text-light-cyan-50' : 'bg-frosted-mint-600 hover:bg-frosted-mint-700 disabled:bg-bone-300 disabled:text-bone-500 text-white'}`}
            >
              Join
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}