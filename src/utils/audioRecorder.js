/**
 * Web Audio / MediaRecorder Microphone Capturer
 * Captures microphone audio with robust fallback and auto-permission recovery,
 * calculates real-time RMS volume levels for animations,
 * and encodes audio into standard 16kHz mono WAV format.
 */

export class AudioRecorder {
  constructor(onLevelChange) {
    this.onLevelChange = onLevelChange;
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.animFrame = null;
    this.startTime = 0;
  }

  async start(deviceId = null) {
    if (this.isRecording) return true;

    try {
      // 1. Try with preferred device constraint
      let constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        video: false,
      };

      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (devErr) {
        // Fallback to default system audio if specific device index had an issue
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }

      this.isRecording = true;
      this.startTime = Date.now();
      this.audioChunks = [];

      // Setup Web Audio Analyser for RMS animation
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx({ sampleRate: 16000 });
        const source = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        this._monitorLevel();
      } catch (ctxErr) {
        console.warn('AudioContext level monitor notice:', ctxErr);
      }

      // MediaRecorder for capturing audio
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.audioChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      return true;
    } catch (e) {
      console.error('Failed to start microphone recording:', e);
      this.isRecording = false;
      return false;
    }
  }

  _monitorLevel() {
    if (!this.isRecording || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const avg = sum / bufferLength;
    const normalized = Math.min(1.0, Math.max(0.0, avg / 128.0));

    if (this.onLevelChange) {
      this.onLevelChange(normalized);
    }

    this.animFrame = requestAnimationFrame(() => this._monitorLevel());
  }

  async stop() {
    if (!this.isRecording) return { base64: null, duration: 0 };

    this.isRecording = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    const duration = (Date.now() - this.startTime) / 1000;

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        this._cleanup();
        return resolve({ base64: null, duration: 0 });
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();

          const wavBase64 = await this._convertToWavBase64(arrayBuffer);
          this._cleanup();
          resolve({ base64: wavBase64, duration });
        } catch (err) {
          console.error('Error processing audio recording:', err);
          this._cleanup();
          resolve({ base64: null, duration: 0 });
        }
      };

      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (e) {
        this._cleanup();
        resolve({ base64: null, duration });
      }
    });
  }

  cancel() {
    this.isRecording = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this._cleanup();
  }

  _cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioChunks = [];
  }

  async _convertToWavBase64(arrayBuffer) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const tempCtx = new AudioCtx({ sampleRate: 16000 });
    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
    tempCtx.close();

    const numOfChannels = 1;
    const sampleRate = 16000;
    const format = 1; // PCM
    const bitDepth = 16;

    const channelData = audioBuffer.getChannelData(0);
    const numSamples = channelData.length;
    const byteRate = (sampleRate * numOfChannels * bitDepth) / 8;
    const blockAlign = (numOfChannels * bitDepth) / 8;
    const dataSize = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    this._writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this._writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this._writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // data sub-chunk
    this._writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write samples
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      const val = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, val, true);
      offset += 2;
    }

    // Convert to base64
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  _writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  static async getAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    } catch (e) {
      return [];
    }
  }
}
