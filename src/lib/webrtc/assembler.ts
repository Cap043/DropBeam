export function receiveFileChunks(
  channel: RTCDataChannel,
  fileSize: number,
  mimeType: string,
  writable: any | null,
  onProgress: (percent: number) => void,
  onComplete: (fallbackBlob?: Blob) => void,
  onCancel: () => void
) {
  channel.binaryType = "arraybuffer";

  let bytesReceived = 0;
  let lastReportedPercent = -1;
  let lastLoggedPercent = -1;

  let cancelled = false;
  let eofReceived = false;

  const startTime = performance.now();

  // ============================================================
  // RAM FALLBACK
  // ============================================================

  const fallbackChunks: ArrayBuffer[] = [];

  // ============================================================
  // DIRECT WRITE QUEUE
  // ============================================================

  const writeQueue: ArrayBuffer[] = [];

  let writing = false;

  // ============================================================
  // WRITE QUEUE PROCESSOR
  // ============================================================

  const processWriteQueue = async () => {
    if (writing || cancelled) {
      return;
    }

    writing = true;

    try {
      while (
        writeQueue.length > 0 &&
        !cancelled
      ) {
        const chunk = writeQueue.shift();

        if (!chunk) {
          continue;
        }

        if (writable) {
          await writable.write(chunk);
        }
      }
    } catch (error) {
      console.error(
        "[RECEIVER] ❌ Disk write failed:",
        error
      );

      cancelled = true;

      try {
        if (writable?.abort) {
          await writable.abort();
        }
      } catch {}

      onCancel();
    } finally {
      writing = false;
    }
  };

  // ============================================================
  // WAIT FOR WRITE QUEUE
  // ============================================================

  const waitForWrites = async () => {
    while (
      writing ||
      writeQueue.length > 0
    ) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 5);
      });
    }
  };

  // ============================================================
  // COMPLETE
  // ============================================================

  const finishTransfer = async () => {
    if (cancelled) {
      return;
    }

    // Wait for direct-disk writes to finish.
    await waitForWrites();

    if (cancelled) {
      return;
    }

    if (bytesReceived !== fileSize) {
      console.error(
        `[RECEIVER] ❌ Size mismatch. ` +
        `Expected ${fileSize}, received ${bytesReceived}.`
      );

      return;
    }

    const elapsed =
      (performance.now() - startTime) / 1000;

    const speed =
      (bytesReceived / 1024 / 1024) /
      Math.max(elapsed, 0.001);

    console.log(
      `[RECEIVER] 🎉 Transfer complete | ` +
      `${(bytesReceived / 1024 / 1024).toFixed(2)} MB | ` +
      `${elapsed.toFixed(2)}s | ` +
      `${speed.toFixed(2)} MB/s`
    );

    // ----------------------------------------------------------
    // DIRECT DISK
    // ----------------------------------------------------------

    if (writable) {
      try {
        await writable.close();
      } catch (error) {
        console.error(
          "[RECEIVER] ❌ Failed to close file:",
          error
        );
      }

      onComplete();
      return;
    }

    // ----------------------------------------------------------
    // RAM FALLBACK
    // ----------------------------------------------------------

    const blob = new Blob(
      fallbackChunks,
      {
        type: mimeType
      }
    );

    onComplete(blob);
  };

  // ============================================================
  // CANCEL
  // ============================================================

  const cancelTransfer = async () => {
    if (cancelled) {
      return;
    }

    cancelled = true;

    writeQueue.length = 0;

    try {
      if (writable?.abort) {
        await writable.abort();
      }
    } catch {}

    onCancel();
  };

  // ============================================================
  // HANDLE BINARY DATA
  // ============================================================

  const handleChunk = (
    buffer: ArrayBuffer
  ) => {
    if (cancelled || eofReceived) {
      return;
    }

    bytesReceived += buffer.byteLength;

    // ----------------------------------------------------------
    // Safety validation
    // ----------------------------------------------------------

    if (bytesReceived > fileSize) {
      console.error(
        "[RECEIVER] ❌ Received more data than expected."
      );

      void cancelTransfer();
      return;
    }

    // ----------------------------------------------------------
    // Store data
    // ----------------------------------------------------------

    if (writable) {
      /*
       * Don't await here.
       *
       * WebRTC can continue delivering data while the file
       * writer works.
       */
      writeQueue.push(buffer);

      void processWriteQueue();
    } else {
      /*
       * Your current HTTP development environment.
       */
      fallbackChunks.push(buffer);
    }

    // ----------------------------------------------------------
    // Progress
    // ----------------------------------------------------------

    const percent = Math.min(
      100,
      Math.floor(
        (bytesReceived / fileSize) * 100
      )
    );

    if (
      percent !== lastReportedPercent
    ) {
      onProgress(percent);
      lastReportedPercent = percent;
    }

    // ----------------------------------------------------------
    // Telemetry every 10%
    // ----------------------------------------------------------

    if (
      percent > 0 &&
      percent % 10 === 0 &&
      percent !== lastLoggedPercent
    ) {
      lastLoggedPercent = percent;

      const elapsed =
        (performance.now() - startTime) / 1000;

      const speed =
        (bytesReceived / 1024 / 1024) /
        Math.max(elapsed, 0.001);

      console.log(
        `[RECEIVER] 📊 Progress: ${percent}% | ` +
        `Received: ${(bytesReceived / 1024 / 1024).toFixed(2)} MB | ` +
        `Speed: ${speed.toFixed(2)} MB/s`
      );
    }
  };

  // ============================================================
  // MESSAGE HANDLER
  // ============================================================

  channel.onmessage = (event) => {
    if (cancelled) {
      return;
    }

    // ==========================================================
    // CONTROL MESSAGE
    // ==========================================================

    if (
      typeof event.data === "string"
    ) {
      let msg: any;

      try {
        msg = JSON.parse(event.data);
      } catch {
        console.warn(
          "[RECEIVER] ⚠️ Invalid control message."
        );

        return;
      }

      // --------------------------------------------------------
      // CANCEL
      // --------------------------------------------------------

      if (msg.type === "CANCEL") {
        console.warn(
          "[RECEIVER] 🛑 Remote peer cancelled transfer."
        );

        void cancelTransfer();
        return;
      }

      // --------------------------------------------------------
      // EOF
      // --------------------------------------------------------

      if (msg.type === "EOF") {
        if (eofReceived) {
          return;
        }

        eofReceived = true;

        console.log(
          "[RECEIVER] 📦 EOF received."
        );

        void finishTransfer();

        return;
      }

      return;
    }

    // ==========================================================
    // BINARY DATA
    // ==========================================================

    if (
      event.data instanceof ArrayBuffer
    ) {
      handleChunk(event.data);
      return;
    }

    // ==========================================================
    // BLOB SAFETY
    // ==========================================================

    if (
      event.data instanceof Blob
    ) {
      void event.data
        .arrayBuffer()
        .then(handleChunk)
        .catch((error) => {
          console.error(
            "[RECEIVER] ❌ Failed to process Blob:",
            error
          );

          void cancelTransfer();
        });

      return;
    }

    console.warn(
      "[RECEIVER] ⚠️ Unknown DataChannel message type."
    );
  };

  console.log(
    `[RECEIVER] 📥 Ready to receive chunks. ` +
    `Expected size: ` +
    `${(fileSize / 1024 / 1024).toFixed(2)} MB`
  );
}