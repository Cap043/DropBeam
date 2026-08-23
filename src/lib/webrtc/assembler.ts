export function receiveFileChunks(
  channel: RTCDataChannel,
  fileSize: number,
  mimeType: string,
  writable: any | null,
  onProgress: (percent: number) => void,
  onComplete: (fallbackBlob?: Blob) => void,
  onCancel: () => void
) {
  let bytesReceived = 0;
  let fallbackChunks: ArrayBuffer[] = [];
  let lastReportedPercent = -1; // 🌟 ADDED: Track the last percent reported
  const startTime = performance.now();
  
  channel.binaryType = "arraybuffer";

  console.log(`[RECEIVER] 📥 Ready to receive chunks. Expected size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

  channel.onmessage = async (event) => {
    if (typeof event.data === "string") {
      const msg = JSON.parse(event.data);
      
      if (msg.type === "CANCEL") {
        console.warn(`[RECEIVER] 🛑 Remote peer cancelled the transfer.`);
        if (writable) await writable.close().catch(() => {});
        onCancel();
        return;
      }

      if (msg.type === "EOF") {
        const elapsedSec = (performance.now() - startTime) / 1000;
        console.log(`[RECEIVER] 🎉 Transfer complete in ${elapsedSec.toFixed(2)}s! Saving file...`);

        if (writable) {
          await writable.close();
          onComplete();
        } else {
          const blob = new Blob(fallbackChunks, { type: mimeType });
          onComplete(blob);
        }
      }
    } 
    else {
      bytesReceived += event.data.byteLength;
      
      if (writable) {
        await writable.write(event.data);
      } else {
        fallbackChunks.push(event.data);
      }

      const percent = Math.round((bytesReceived / fileSize) * 100);

      // 🌟 ADDED: Only trigger a React update and logs if the integer percentage has changed!
      if (percent !== lastReportedPercent) {
        onProgress(percent);

        // Real-time terminal telemetry every 10%
        if (percent % 10 === 0) {
          const elapsedSec = (performance.now() - startTime) / 1000;
          const speedMBps = (bytesReceived / (1024 * 1024)) / (elapsedSec || 0.001);
          console.log(`[RECEIVER] 📊 Progress: ${percent}% | Received: ${(bytesReceived / 1024 / 1024).toFixed(2)} MB | Speed: ${speedMBps.toFixed(2)} MB/s`);
        }

        lastReportedPercent = percent;
      }
    }
  };
}