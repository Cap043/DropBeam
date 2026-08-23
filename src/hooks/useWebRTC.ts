"use client";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useWebRTC(roomId: string, isInitiator: boolean) {
  const [status, setStatus] = useState("Disconnected");
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);

  useEffect(() => {
    // 1. Connect to signaling server
    socketRef.current = io("http://localhost:3001");
    const socket = socketRef.current;

    // 2. Setup WebRTC Peer Connection
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerRef.current = peer;

    // 3. Handle ICE Candidates (finding IP addresses)
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("signal", { roomId, signal: { type: "candidate", candidate: event.candidate } });
      }
    };

    // 4. Setup Data Channel
    if (isInitiator) {
      const channel = peer.createDataChannel("dropbeam-file-channel");
      setupChannel(channel);
      
      // When a receiver joins, create and send an Offer
      socket.on("peer-joined", async () => {
        setStatus("Peer joined, sending offer...");
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("signal", { roomId, signal: offer });
      });
    } else {
      // Receiver listens for the channel created by the initiator
      peer.ondatachannel = (event) => setupChannel(event.channel);
    }

    function setupChannel(channel: RTCDataChannel) {
      channelRef.current = channel;
      channel.onopen = () => setStatus("P2P Channel Open! 🚀");
      channel.onclose = () => setStatus("Disconnected");
    }

    // 5. Handle incoming signals
    socket.on("signal", async (signal) => {
      if (signal.type === "offer") {
        setStatus("Offer received, sending answer...");
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("signal", { roomId, signal: answer });
      } else if (signal.type === "answer") {
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.type === "candidate") {
        await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    });

    socket.emit("join-room", roomId);

    return () => {
      peer.close();
      socket.disconnect();
    };
  }, [roomId, isInitiator]);

  return { status, channel: channelRef.current };
}