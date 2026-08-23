"use client";

import { useWebRTC } from "../../../hooks/useWebRTC";
import { receiveFileChunks } from "../../../lib/webrtc/assembler";
import {
  use,
  useEffect,
  useState
} from "react";

export default function ReceivePage({
  params
}: {
  params: Promise<{ roomId: string }>
}) {
  const resolvedParams =
    use(params);

const {
  status,
  channel,
  controlChannel,
  requestCancel,
  handleRemoteCancel
} = useWebRTC(
  resolvedParams.roomId,
  false
);

  const [incomingFile, setIncomingFile] =
    useState<any>(null);

  const [progress, setProgress] =
    useState(0);

  const [isDone, setIsDone] =
    useState(false);

  // ============================================================
  // RESET
  // ============================================================

  const resetReceiver = () => {
    setIncomingFile(null);
    setProgress(0);
    setIsDone(false);
  };

  // ============================================================
  // FILE CHANNEL
  // ============================================================

  useEffect(() => {
    if (!channel) {
      return;
    }

    channel.onmessage =
      (event) => {
        if (
          typeof event.data !==
          "string"
        ) {
          return;
        }

        let msg: any;

        try {
          msg = JSON.parse(
            event.data
          );
        } catch {
          return;
        }

        if (
          msg.type === "metadata"
        ) {
          setIncomingFile(msg);
          setProgress(0);
          setIsDone(false);
        }
      };

    return () => {
      /*
       * Only clear our handler if this is still the same
       * channel instance.
       */
      channel.onmessage =
        null;
    };
  }, [channel]);

  // ============================================================
  // CONTROL CHANNEL
  // ============================================================
useEffect(() => {
  if (!controlChannel) {
    return;
  }

  const handleControlMessage = (
    event: MessageEvent
  ) => {
    if (
      typeof event.data !== "string"
    ) {
      return;
    }

    let msg: any;

    try {
      msg = JSON.parse(
        event.data
      );
    } catch {
      return;
    }

    if (
      msg.type === "CANCEL"
    ) {
      console.log(
        "[RECEIVER] 🛑 Sender cancelled transfer."
      );

      /*
       * IMPORTANT:
       *
       * Do NOT call requestCancel().
       *
       * This is a REMOTE cancellation.
       * We only stop the local transfer.
       */
      handleRemoteCancel();

      resetReceiver();
    }
  };

  controlChannel.addEventListener(
    "message",
    handleControlMessage
  );

  return () => {
    controlChannel.removeEventListener(
      "message",
      handleControlMessage
    );
  };
}, [
  controlChannel,
  handleRemoteCancel,
]);
  // ============================================================
  // ACCEPT
  // ============================================================

  const handleAccept =
    async () => {
      if (
        !channel ||
        !incomingFile
      ) {
        return;
      }

      let writable =
        null;

      try {
        const handle =
          await (
            window as any
          ).showSaveFilePicker({
            suggestedName:
              incomingFile.name
          });

        writable =
          await handle.createWritable();

      } catch (err) {
        /*
         * Expected during HTTP development.
         */
        console.warn(
          "Save picker aborted. Using RAM fallback."
        );
      }

      // --------------------------------------------------------
      // ACCEPT
      // --------------------------------------------------------

      if (
        channel.readyState !==
        "open"
      ) {
        return;
      }

      channel.send(
        JSON.stringify({
          type: "accept"
        })
      );

      // --------------------------------------------------------
      // RECEIVE
      // --------------------------------------------------------

      receiveFileChunks(
        channel,
        incomingFile.size,
        incomingFile.mime,
        writable,

        (pct) => {
          setProgress(pct);
        },

        (fallbackBlob) => {
          setIsDone(true);

          if (fallbackBlob) {
            const url =
              URL.createObjectURL(
                fallbackBlob
              );

            const a =
              document.createElement(
                "a"
              );

            a.href = url;
            a.download =
              incomingFile.name;

            a.click();

            setTimeout(() => {
              URL.revokeObjectURL(
                url
              );
            }, 1000);
          }
        },

        () => {
          alert(
            "Transfer was cancelled."
          );

          resetReceiver();
        }
      );
    };

  // ============================================================
  // CANCEL / REJECT
  // ============================================================

  const handleCancel = () => {
  console.log(
    "[RECEIVER] 🛑 Local user cancelled/rejected transfer."
  );

  /*
   * This is LOCAL cancellation.
   *
   * It sends CANCEL once.
   */
  requestCancel();

  resetReceiver();
};

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="p-10 flex flex-col gap-4 max-w-md text-black">

      <h1 className="text-xl font-bold text-white">
        Receiver
      </h1>

      <p className="text-white">
        Joined Room:{" "}
        <strong className="text-blue-400">
          {resolvedParams.roomId}
        </strong>
      </p>

      <p className="border p-2 bg-gray-100 rounded">
        Status: {status}
      </p>

      {incomingFile &&
        progress === 0 &&
        !isDone && (
          <div className="border p-4 bg-yellow-50 rounded flex flex-col gap-3">

            <p>
              <strong>
                Incoming File:
              </strong>{" "}
              {incomingFile.name}
            </p>

            <p>
              <strong>
                Size:
              </strong>{" "}
              {(
                incomingFile.size /
                (1024 * 1024)
              ).toFixed(2)}{" "}
              MB
            </p>

            <div className="flex gap-2">

              <button
                onClick={
                  handleAccept
                }
                className="p-2 bg-green-600 text-white rounded flex-1 font-bold"
              >
                Accept & Save
              </button>

              <button
                onClick={
                  handleCancel
                }
                className="p-2 bg-red-600 text-white rounded font-bold"
              >
                Reject
              </button>

            </div>
          </div>
        )}

      {progress > 0 &&
        progress < 100 && (
          <div className="border p-4 bg-green-50 rounded flex flex-col gap-3">

            <div>
              Receiving:{" "}
              {progress}%
            </div>

            <button
              onClick={
                handleCancel
              }
              className="p-2 bg-red-600 text-white rounded font-bold"
            >
              Cancel Transfer 🛑
            </button>

          </div>
        )}

      {isDone && (
        <div className="border p-4 bg-green-50 rounded flex flex-col gap-3">

          <div className="text-green-700 font-bold">
            Transfer Complete! 🎉
          </div>

          <button
            onClick={
              resetReceiver
            }
            className="p-2 bg-blue-600 text-white rounded font-bold"
          >
            Ready for Next File
          </button>

        </div>
      )}

    </div>
  );
}