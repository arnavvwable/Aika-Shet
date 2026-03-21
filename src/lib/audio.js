let audioCtx = null;
let mediaRecorder = null;
let stream = null;

// Initialize Audio Context on user interaction (required by browsers)
export function initAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Start capturing mic and emitting chunks to socket
export async function startRecording(socket) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // We use a small timeslice (e.g. 100ms) for low latency Walkie Talkie feel
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && socket) {
        // Emit raw Blob data
        socket.emit('audio-chunk', e.data);
      }
    };
    mediaRecorder.start(100);
    return true;
  } catch (err) {
    console.error('Mic access denied or error:', err);
    return false;
  }
}

// Stop capturing
export function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

// Play received audio chunks
export async function playChunk(chunkBlob) {
  if (!audioCtx) return;
  
  try {
    const arrayBuffer = await chunkBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start(0);
  } catch (err) {
    console.error('Error decoding/playing audio chunk:', err);
  }
}
