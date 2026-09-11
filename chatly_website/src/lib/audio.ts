/**
 * Containers that play reliably across browsers and both native apps. Chromium
 * records `audio/webm`, which Safari (and some Android builds) cannot play, so
 * anything outside this list is transcoded to WAV.
 */
const UNIVERSALLY_PLAYABLE = ['audio/mp4', 'audio/wav', 'audio/aac', 'audio/mpeg'];

/** Voice-friendly downsample target. 16 kHz mono PCM is ~1.9 MB per minute. */
const TARGET_SAMPLE_RATE = 16_000;

/**
 * The server caps uploads at 10 MB. PCM is uncompressed, so a very long note
 * could exceed the cap once transcoded; past this size we keep the original
 * recording instead of making the upload impossible.
 */
const MAX_TRANSCODED_BYTES = 9_000_000;

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

/** Average all channels down to a single mono track. */
function mixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);

  const length = buffer.length;
  const mono = new Float32Array(length);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      mono[index] += data[index] / buffer.numberOfChannels;
    }
  }

  return mono;
}

/** Linear-interpolation resample. Good enough for speech. */
function resample(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return input;

  const ratio = inputRate / outputRate;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    const position = index * ratio;
    const lower = Math.floor(position);
    const fraction = position - lower;
    const a = input[lower] ?? 0;
    const b = input[lower + 1] ?? a;
    output[index] = a + (b - a) * fraction;
  }

  return output;
}

/** Encode mono float samples as a 16-bit PCM WAV. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');

  // fmt chunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1, offset += 2) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function transcodeToWav(input: Blob): Promise<Blob> {
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextCtor) throw new Error('Web Audio is not available');

  const arrayBuffer = await input.arrayBuffer();
  const context = new AudioContextCtor();

  try {
    const decoded = await context.decodeAudioData(arrayBuffer);
    const mono = mixToMono(decoded);
    const resampled = resample(mono, decoded.sampleRate, TARGET_SAMPLE_RATE);
    return encodeWav(resampled, TARGET_SAMPLE_RATE);
  } finally {
    void context.close().catch(() => {
      /* context is already closed */
    });
  }
}

/**
 * Ensure a recorded voice note uses a container every client can play. Falls
 * back to the original recording if transcoding is unavailable so a voice note
 * is never lost.
 */
export async function normalizeVoiceFile(file: File): Promise<File> {
  if (UNIVERSALLY_PLAYABLE.some((type) => file.type.startsWith(type))) return file;

  try {
    const wav = await transcodeToWav(file);

    if (wav.size > MAX_TRANSCODED_BYTES) {
      console.warn(
        '[audio] Transcoded note exceeds the upload budget; sending the original recording',
      );
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([wav], `${baseName}.wav`, { type: 'audio/wav' });
  } catch (error) {
    console.warn('[audio] WAV transcode failed; uploading the original recording', error);
    return file;
  }
}
