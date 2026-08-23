"use client";
import { useWebRTC } from "../../../hooks/useWebRTC";
import { use, useEffect, useState } from "react";

export default function SendPage({ params }: { params: Promise<{ roomId: string }> }) {
  // React 19 / Next.js 15 requires unrolling params with React.use()
  const resolvedParams = use(params); 
  const { status } = useWebRTC(resolvedParams.roomId, true);

  return (
    <div className="p-10">
      <h1 className="text-xl font-bold">Sender</h1>
      <p>Room Code: <strong className="text-blue-500">{resolvedParams.roomId}</strong></p>
      <p className="mt-4 border p-2 bg-gray-100 text-black">Status: {status}</p>
    </div>
  );
}