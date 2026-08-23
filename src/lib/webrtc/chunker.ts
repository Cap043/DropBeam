const CHUNK_SIZE = 256 * 1024;
const MAX_BUFFER = 4 * 1024 * 1024;
const LOW_BUFFER = 512 * 1024;

function waitForBufferedAmount(
  channel: RTCDataChannel,
  target: number
): Promise<void> {
  if (
    channel.bufferedAmount <= target
  ) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let finished = false;

    let timer:
      ReturnType<typeof setInterval> |
      null = null;

    const cleanup = () => {
      if (finished) return;

      finished = true;

      channel.removeEventListener(
        "bufferedamountlow",
        onLow
      );

      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      resolve();
    };

    const onLow = () => {
      if (
        channel.bufferedAmount <= target
      ) {
        cleanup();
      }
    };

    channel.addEventListener(
      "bufferedamountlow",
      onLow
    );

    timer = setInterval(() => {
      if (
        channel.readyState !==
          "open" ||
        channel.bufferedAmount <=
          target
      ) {
        cleanup();
      }
    }, 10);

    onLow();
  });
}

export async function sendFileChunks(
  channel: RTCDataChannel,
  file: File,
  onProgress: (percent: number) => void,
  isCancelled: () => boolean
) {
  if (
    channel.readyState !==
    "open"
  ) {
    throw new Error(
      "DataChannel is not open."
    );
  }

  channel.bufferedAmountLowThreshold =
    LOW_BUFFER;

  let offset = 0;
  let lastReportedPercent = -1;
  let lastLoggedPercent = -1;

  const startTime =
    performance.now();

  console.log(
    `[SENDER] 🚀 Starting transfer: "${file.name}" ` +
      `(${(
        file.size /
        1024 /
        1024
      ).toFixed(2)} MB)`
  );

  while (
    offset < file.size
  ) {
    // ----------------------------------------------------------
    // CANCEL
    // ----------------------------------------------------------

    if (isCancelled()) {
      console.warn(
        "[SENDER] 🛑 Cancel detected."
      );

      return;
    }

    // ----------------------------------------------------------
    // CHANNEL CLOSED
    // ----------------------------------------------------------

    if (
      channel.readyState !==
      "open"
    ) {
      console.warn(
        "[SENDER] 🛑 File channel closed."
      );

      return;
    }

    // ----------------------------------------------------------
    // BACKPRESSURE
    // ----------------------------------------------------------

    if (
      channel.bufferedAmount >=
      MAX_BUFFER
    ) {
      await waitForBufferedAmount(
        channel,
        LOW_BUFFER
      );

      if (isCancelled()) {
        console.warn(
          "[SENDER] 🛑 Cancel detected while waiting."
        );

        return;
      }

      if (
        channel.readyState !==
        "open"
      ) {
        return;
      }
    }

    // ----------------------------------------------------------
    // READ CHUNK
    // ----------------------------------------------------------

    const end = Math.min(
      offset + CHUNK_SIZE,
      file.size
    );

    const buffer =
      await file
        .slice(offset, end)
        .arrayBuffer();

    // ----------------------------------------------------------
    // CRITICAL CANCEL CHECK
    // ----------------------------------------------------------

    if (isCancelled()) {
      console.warn(
        "[SENDER] 🛑 Cancel detected before send."
      );

      return;
    }

    if (
      channel.readyState !==
      "open"
    ) {
      return;
    }

    // ----------------------------------------------------------
    // SEND
    // ----------------------------------------------------------

    try {
      channel.send(buffer);
    } catch (error) {
      console.error(
        "[SENDER] ❌ Failed to send chunk:",
        error
      );

      return;
    }

    offset +=
      buffer.byteLength;

    // ----------------------------------------------------------
    // PROGRESS
    // ----------------------------------------------------------

    const percent =
      Math.min(
        100,
        Math.floor(
          (offset /
            file.size) *
            100
        )
      );

    if (
      percent !==
      lastReportedPercent
    ) {
      onProgress(percent);

      lastReportedPercent =
        percent;
    }

    // ----------------------------------------------------------
    // TELEMETRY
    // ----------------------------------------------------------

    if (
      percent >= 10 &&
      percent % 10 === 0 &&
      percent !==
        lastLoggedPercent
    ) {
      lastLoggedPercent =
        percent;

      const elapsed =
        (performance.now() -
          startTime) /
        1000;

      const speed =
        (offset /
          1024 /
          1024) /
        Math.max(
          elapsed,
          0.001
        );

      console.log(
        `[SENDER] 📊 Progress: ${percent}% | ` +
          `Sent: ${(
            offset /
            1024 /
            1024
          ).toFixed(2)} MB | ` +
          `Speed: ${speed.toFixed(
            2
          )} MB/s | ` +
          `Buffer: ${(
            channel.bufferedAmount /
            1024
          ).toFixed(0)} KB`
      );
    }
  }

  // ============================================================
  // WAIT FOR ALL FILE DATA TO DRAIN
  // ============================================================

  if (
    isCancelled() ||
    channel.readyState !==
      "open"
  ) {
    return;
  }

  await waitForBufferedAmount(
    channel,
    0
  );

  // ------------------------------------------------------------
  // CANCEL CHECK AFTER DRAIN
  // ------------------------------------------------------------

  if (
    isCancelled() ||
    channel.readyState !==
      "open"
  ) {
    return;
  }

  // ============================================================
  // EOF
  // ============================================================

  channel.send(
    JSON.stringify({
      type: "EOF"
    })
  );

  const elapsed =
    (performance.now() -
      startTime) /
    1000;

  const speed =
    (file.size /
      1024 /
      1024) /
    Math.max(
      elapsed,
      0.001
    );

  console.log(
    `[SENDER] ✅ All chunks drained. EOF sent | ` +
      `${elapsed.toFixed(
        2
      )}s | ` +
      `${speed.toFixed(
        2
      )} MB/s`
  );
}