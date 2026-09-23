/**
 * AudioWorklet for the DJ portal's mix recorder (/my/dj).
 *
 * Runs on the audio thread and hands raw input frames to the page in ~100 ms
 * batches (left + right Float32Arrays, transferred, not copied). A mono input
 * is sent as the same samples on both sides. The page does the metering and
 * builds the WAV; nothing here touches the output, so the studio feed is never
 * monitored back out of the speakers.
 */
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = Math.max(128, Math.round(sampleRate / 10));
    this.l = new Float32Array(this.size);
    this.r = new Float32Array(this.size);
    this.n = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input.length) {
      const a = input[0];
      const b = input[1] || input[0];
      for (let i = 0; i < a.length; i++) {
        this.l[this.n] = a[i];
        this.r[this.n] = b[i];
        this.n++;
        if (this.n === this.size) this.flush();
      }
    }
    return true;
  }

  flush() {
    const l = this.l.slice(0, this.n);
    const r = this.r.slice(0, this.n);
    this.port.postMessage({ l, r }, [l.buffer, r.buffer]);
    this.n = 0;
  }
}

registerProcessor("pcm-capture", PcmCapture);
