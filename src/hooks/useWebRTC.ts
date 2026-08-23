"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";

export function useWebRTC(
  roomId: string,
  isInitiator: boolean
) {
  const [status, setStatus] =
    useState("Disconnected");

  const [channel, setChannel] =
    useState<RTCDataChannel | null>(null);

  const [controlChannel, setControlChannel] =
    useState<RTCDataChannel | null>(null);

  const socketRef =
    useRef<Socket | null>(null);

  const peerRef =
    useRef<RTCPeerConnection | null>(null);

  const channelRef =
    useRef<RTCDataChannel | null>(null);

  const controlChannelRef =
    useRef<RTCDataChannel | null>(null);

  // Prevent multiple replacement channels.
  const recreatePendingRef =
    useRef(false);

  const mountedRef =
    useRef(false);

  // ============================================================
  // FILE CHANNEL SETUP
  // ============================================================

  const setupFileChannel = useCallback(
    (fileChannel: RTCDataChannel) => {
      console.log(
        `[WebRTC] 📡 Setting up file channel: ${fileChannel.label}`
      );

      fileChannel.binaryType =
        "arraybuffer";

      channelRef.current =
        fileChannel;

      fileChannel.onopen = () => {
        console.log(
          "[WebRTC] 📡 File channel opened."
        );

        if (
          !mountedRef.current
        ) {
          return;
        }

        channelRef.current =
          fileChannel;

        setChannel(fileChannel);

        setStatus(
          "P2P Channel Open! 🚀"
        );
      };

      fileChannel.onclose = () => {
        console.log(
          "[WebRTC] 📡 File channel closed."
        );

        if (
          channelRef.current ===
          fileChannel
        ) {
          channelRef.current =
            null;

          if (mountedRef.current) {
            setChannel(null);
          }
        }

        // ------------------------------------------------------
        // ONLY THE INITIATOR creates a replacement channel.
        // ONLY if we explicitly requested one.
        // ------------------------------------------------------

        if (
          isInitiator &&
          recreatePendingRef.current &&
          mountedRef.current
        ) {
          recreatePendingRef.current =
            false;

          setTimeout(() => {
            if (
              !mountedRef.current ||
              !peerRef.current
            ) {
              return;
            }

            if (
              peerRef.current.connectionState ===
              "closed"
            ) {
              return;
            }

            console.log(
              "[WebRTC] 🔄 Creating ONE fresh file channel..."
            );

            const newChannel =
              peerRef.current.createDataChannel(
                "dropbeam-file-channel"
              );

            setupFileChannel(
              newChannel
            );
          }, 100);
        }
      };

      fileChannel.onerror = (
        event
      ) => {
        console.error(
          "[WebRTC] ❌ File channel error:",
          event
        );
      };
    },
    [isInitiator]
  );

  // ============================================================
  // CONTROL CHANNEL SETUP
  // ============================================================

  const setupControlChannel =
    useCallback(
      (
        ctrl: RTCDataChannel
      ) => {
        console.log(
          `[WebRTC] 🎛️ Setting up control channel: ${ctrl.label}`
        );

        ctrl.binaryType =
          "arraybuffer";

        controlChannelRef.current =
          ctrl;

        ctrl.onopen = () => {
          console.log(
            "[WebRTC] 🎛️ Control channel opened."
          );

          if (
            mountedRef.current
          ) {
            setControlChannel(
              ctrl
            );
          }
        };

        ctrl.onclose = () => {
          console.log(
            "[WebRTC] 🎛️ Control channel closed."
          );

          if (
            controlChannelRef.current ===
            ctrl
          ) {
            controlChannelRef.current =
              null;

            if (
              mountedRef.current
            ) {
              setControlChannel(
                null
              );
            }
          }
        };

        ctrl.onerror = (
          event
        ) => {
          console.error(
            "[WebRTC] ❌ Control channel error:",
            event
          );
        };
      },
      []
    );

  // ============================================================
  // LOCAL CANCEL
  //
  // Called ONLY when THIS user presses Cancel/Reject.
  // ============================================================

  const requestCancel =
    useCallback(() => {
      console.log(
        "[WebRTC] 🛑 Local cancellation requested."
      );

      // --------------------------------------------------------
      // Tell the remote peer ONCE.
      // --------------------------------------------------------

      const ctrl =
        controlChannelRef.current;

      if (
        ctrl &&
        ctrl.readyState === "open"
      ) {
        try {
          ctrl.send(
            JSON.stringify({
              type: "CANCEL",
            })
          );
        } catch (error) {
          console.warn(
            "[WebRTC] Failed to send CANCEL:",
            error
          );
        }
      }

      // --------------------------------------------------------
      // Close current file channel.
      // This immediately kills queued file data.
      // --------------------------------------------------------

      const file =
        channelRef.current;

      if (file) {
        // Initiator must create exactly ONE replacement.
        if (isInitiator) {
          recreatePendingRef.current =
            true;
        }

        try {
          if (
            file.readyState ===
              "open" ||
            file.readyState ===
              "closing"
          ) {
            file.close();
          }
        } catch (error) {
          console.warn(
            "[WebRTC] Failed to close file channel:",
            error
          );
        }
      }
    }, [isInitiator]);

  // ============================================================
  // REMOTE CANCEL
  //
  // IMPORTANT:
  // NEVER send CANCEL back.
  // ============================================================

  const handleRemoteCancel =
    useCallback(() => {
      console.log(
        "[WebRTC] 🛑 Remote cancellation received."
      );

      const file =
        channelRef.current;

      if (file) {
        /*
         * Do NOT set recreatePendingRef here.
         *
         * Only the initiator that owns channel creation
         * recreates it after the channel closes.
         */
        try {
          if (
            file.readyState ===
              "open" ||
            file.readyState ===
              "closing"
          ) {
            file.close();
          }
        } catch (error) {
          console.warn(
            "[WebRTC] Failed to close remotely cancelled file channel:",
            error
          );
        }
      }
    }, []);

  // ============================================================
  // WEBRTC INITIALIZATION
  // ============================================================

  useEffect(() => {
    mountedRef.current =
      true;

    // ----------------------------------------------------------
    // SIGNALING SERVER
    // ----------------------------------------------------------

    socketRef.current = io(
      `http://${window.location.hostname}:3001`
    );

    const socket =
      socketRef.current;

    // ----------------------------------------------------------
    // PEER CONNECTION
    // ----------------------------------------------------------

    const peer =
      new RTCPeerConnection({
        iceServers: [
          {
            urls:
              "stun:stun.l.google.com:19302",
          },
        ],
      });

    peerRef.current =
      peer;

    // ----------------------------------------------------------
    // ICE
    // ----------------------------------------------------------

    peer.onicecandidate = (
      event
    ) => {
      if (
        event.candidate
      ) {
        socket.emit(
          "signal",
          {
            roomId,
            signal: {
              type: "candidate",
              candidate:
                event.candidate,
            },
          }
        );
      }
    };

    // ----------------------------------------------------------
    // INITIATOR
    // ----------------------------------------------------------

    if (isInitiator) {
      // Initial file channel
      const fileChannel =
        peer.createDataChannel(
          "dropbeam-file-channel"
        );

      setupFileChannel(
        fileChannel
      );

      // Separate control channel
      const ctrl =
        peer.createDataChannel(
          "dropbeam-control-channel"
        );

      setupControlChannel(
        ctrl
      );

      // --------------------------------------------------------
      // PEER JOINED
      // --------------------------------------------------------

      socket.on(
        "peer-joined",
        async () => {
          if (
            peer.signalingState ===
            "closed"
          ) {
            return;
          }

          setStatus(
            "Peer joined, sending offer..."
          );

          try {
            const offer =
              await peer.createOffer();

            await peer.setLocalDescription(
              offer
            );

            socket.emit(
              "signal",
              {
                roomId,
                signal: offer,
              }
            );
          } catch (error) {
            console.error(
              "[WebRTC] Failed to create offer:",
              error
            );
          }
        }
      );
    }

    // ----------------------------------------------------------
    // RECEIVER
    // ----------------------------------------------------------

    else {
      peer.ondatachannel = (
        event
      ) => {
        const incoming =
          event.channel;

        console.log(
          `[WebRTC] 📥 Incoming channel: ${incoming.label}`
        );

        if (
          incoming.label ===
          "dropbeam-file-channel"
        ) {
          setupFileChannel(
            incoming
          );
        }

        if (
          incoming.label ===
          "dropbeam-control-channel"
        ) {
          setupControlChannel(
            incoming
          );
        }
      };
    }

    // ----------------------------------------------------------
    // SIGNALING
    // ----------------------------------------------------------

    socket.on(
      "signal",
      async (signal) => {
        try {
          if (
            signal.type ===
            "offer"
          ) {
            setStatus(
              "Offer received, sending answer..."
            );

            await peer.setRemoteDescription(
              new RTCSessionDescription(
                signal
              )
            );

            const answer =
              await peer.createAnswer();

            await peer.setLocalDescription(
              answer
            );

            socket.emit(
              "signal",
              {
                roomId,
                signal: answer,
              }
            );
          }

          else if (
            signal.type ===
            "answer"
          ) {
            await peer.setRemoteDescription(
              new RTCSessionDescription(
                signal
              )
            );
          }

          else if (
            signal.type ===
            "candidate"
          ) {
            await peer.addIceCandidate(
              new RTCIceCandidate(
                signal.candidate
              )
            );
          }
        } catch (error) {
          console.error(
            "[WebRTC] Signaling error:",
            error
          );
        }
      }
    );

    // ----------------------------------------------------------
    // JOIN
    // ----------------------------------------------------------

    socket.emit(
      "join-room",
      roomId
    );

    // ----------------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------------

    return () => {
      mountedRef.current =
        false;

      recreatePendingRef.current =
        false;

      try {
        channelRef.current?.close();
      } catch {}

      try {
        controlChannelRef.current?.close();
      } catch {}

      try {
        peer.close();
      } catch {}

      try {
        socket.disconnect();
      } catch {}

      channelRef.current =
        null;

      controlChannelRef.current =
        null;

      peerRef.current =
        null;

      socketRef.current =
        null;
    };
  }, [
    roomId,
    isInitiator,
    setupFileChannel,
    setupControlChannel,
  ]);

  return {
    status,
    channel,
    controlChannel,

    // Local cancellation
    requestCancel,

    // Remote cancellation
    handleRemoteCancel,
  };
}