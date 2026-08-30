"use client";
import { useState, useCallback, useRef } from "react";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isDark?: boolean;
}

export default function FileDropzone({ onFileSelect, isDark = true }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative w-full p-10 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group
        ${isDark 
          ? isDragging 
            ? 'border-baby-blue-ice-400 bg-prussian-blue-800/60 shadow-[0_0_30px_rgba(51,122,255,0.2)]' 
            : 'border-prussian-blue-600/50 bg-prussian-blue-900/30 hover:border-baby-blue-ice-500/50 hover:bg-prussian-blue-800/40'
          : isDragging
            ? 'border-wine-plum-500 bg-bone-200/60 shadow-[0_0_30px_rgba(171,84,96,0.1)]'
            : 'border-bone-300 bg-bone-100/50 hover:border-wine-plum-400/50 hover:bg-bone-200/40'
        }
      `}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileInput} 
        className="hidden" 
      />

      <div className={`w-16 h-16 mb-4 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110
        ${isDark 
          ? 'bg-prussian-blue-800 text-baby-blue-ice-400 shadow-[0_4px_20px_rgba(10,21,41,0.5)]' 
          : 'bg-white text-wine-plum-500 shadow-[0_4px_20px_rgba(212,208,196,0.5)]'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" x2="12" y1="3" y2="15"/>
        </svg>
      </div>
      
      <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-prussian-blue-50' : 'text-bone-950'}`}>
        Click or drag file to this area to send
      </h3>
      
      <p className={`text-sm ${isDark ? 'text-prussian-blue-300' : 'text-bone-600'}`}>
        Support for a single file upload. Transfer will begin once the receiver joins the room.
      </p>
    </div>
  );
}