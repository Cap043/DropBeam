export async function sendFileChunks(
  channel: RTCDataChannel,
  file: File,
  onProgress: (percent: number) => void,
  isCancelled: () => boolean
) {
  const CHUNK_SIZE = 256 * 1024; 
  const MAX_BUFFER = 4 * 1024 * 1024; 

  channel.bufferedAmountLowThreshold = CHUNK_SIZE;
  let offset = 0;
  let lastReportedPercent = -1; // 🌟 ADDED: Track the last percent reported
  const startTime = performance.now();

  console.log(`[SENDER] 🚀 Starting transfer: "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);

  while (offset < file.size) {
    if (isCancelled()) {
      console.warn(`[SENDER] 🛑 Transfer cancelled by user.`);
      channel.send(JSON.stringify({ type: "CANCEL" }));
      return;
    }

    if (channel.bufferedAmount >= MAX_BUFFER) {
      console.log(`[SENDER] ⏳ Buffer full. Pausing...`);
      await new Promise((resolve) => {
        channel.onbufferedamountlow = () => {
          channel.onbufferedamountlow = null;
          resolve(null);
        };
      });
    }

    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await slice.arrayBuffer();
    
    channel.send(buffer);
    offset += buffer.byteLength;
    
    const percent = Math.round((offset / file.size) * 100);
    
    // 🌟 ADDED: Only trigger a React update if the integer percentage has changed!
    if (percent !== lastReportedPercent) {
      onProgress(percent);
      lastReportedPercent = percent;
    }

    if (percent % 10 === 0 && offset === buffer.byteLength * Math.floor(offset / buffer.byteLength)) {
      const elapsedSec = (performance.now() - startTime) / 1000;
      const speedMBps = (offset / (1024 * 1024)) / (elapsedSec || 0.001);
      console.log(`[SENDER] 📊 Progress: ${percent}% | Sent: ${(offset / 1024 / 1024).toFixed(2)} MB | Speed: ${speedMBps.toFixed(2)} MB/s | Buffer: ${(channel.bufferedAmount / 1024).toFixed(1)} KB`);
    }
  }

  console.log(`[SENDER] ✅ File transfer complete successfully.`);
  channel.send(JSON.stringify({ type: "EOF" }));
}