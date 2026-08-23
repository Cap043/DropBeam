export async function sendFileChunks(
  channel: RTCDataChannel,
  file: File,
  onProgress: (percent: number) => void,
  isCancelled: () => boolean
) {
  const CHUNK_SIZE = 64 * 1024; // 64 KB
  const MAX_BUFFER = 4 * 1024 * 1024; // 4MB optimized buffer

  channel.bufferedAmountLowThreshold = CHUNK_SIZE;
  let offset = 0;
  const startTime = performance.now();

  console.log(`[SENDER] 🚀 Starting transfer: "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

  while (offset < file.size) {
    // Check if user clicked Stop
    if (isCancelled()) {
      console.warn(`[SENDER] 🛑 Transfer cancelled by user.`);
      channel.send(JSON.stringify({ type: "CANCEL" }));
      return;
    }

    // Backpressure check with terminal logging
    if (channel.bufferedAmount >= MAX_BUFFER) {
      console.log(`[SENDER] ⏳ Buffer full (${(channel.bufferedAmount / 1024 / 1024).toFixed(2)} MB). Pausing to let network drain...`);
      
      await new Promise((resolve) => {
        channel.onbufferedamountlow = () => {
          channel.onbufferedamountlow = null;
          resolve(null);
        };
      });
      
      console.log(`[SENDER] ▶️ Buffer drained. Resuming stream.`);
    }

    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await slice.arrayBuffer();
    
    channel.send(buffer);
    offset += buffer.byteLength;
    
    const percent = Math.round((offset / file.size) * 100);
    onProgress(percent);

    // Real-time terminal telemetry every 10% or at the end
    if (percent % 10 === 0 && offset === buffer.byteLength * Math.floor(offset / buffer.byteLength)) {
      const elapsedSec = (performance.now() - startTime) / 1000;
      const speedMBps = (offset / (1024 * 1024)) / (elapsedSec || 0.001);
      console.log(`[SENDER] 📊 Progress: ${percent}% | Sent: ${(offset / 1024 / 1024).toFixed(2)} MB | Speed: ${speedMBps.toFixed(2)} MB/s | Buffer: ${(channel.bufferedAmount / 1024).toFixed(1)} KB`);
    }
  }

  console.log(`[SENDER] ✅ File transfer complete successfully.`);
  channel.send(JSON.stringify({ type: "EOF" }));
}