"use client";
import { useWebRTC } from "../../../hooks/useWebRTC";
import { use } from "react";

export default function ReceivePage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const { status } = useWebRTC(resolvedParams.roomId, false);

  return (
    <div className="p-10">
      <h1 className="text-xl font-bold">Receiver</h1>
      <p>Joined Room: <strong>{resolvedParams.roomId}</strong></p>
      <p className="mt-4 border p-2 bg-gray-100 text-black">Status: {status}</p>
    </div>
  );
}