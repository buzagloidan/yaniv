/**
 * Sound manager for Yaniv.
 *
 * - yaniv.wav / asaf.wav  — real recordings, loaded once on demand
 * - All other effects     — synthesised via Web Audio API (no copyright)
 */

let ctx: AudioContext | null = null;
let preloadPromise: Promise<void> | null = null;
let unlockPromise: Promise<boolean> | null = null;
let unlockListenersInstalled = false;

type LegacyAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as LegacyAudioWindow).webkitAudioContext ?? null;
}

function getCtx(): AudioContext {
  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor) {
    throw new Error('Web Audio API is unavailable in this browser.');
  }
  if (!ctx) ctx = new AudioContextCtor();
  return ctx;
}

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem('yaniv_sounds') !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.removeItem('yaniv_sounds');
    } else {
      localStorage.setItem('yaniv_sounds', 'off');
    }
  } catch {
    // ignore
  }
}

// ── Buffered samples (yaniv.wav / asaf.wav) ──────────────────────────────────

const bufferCache: Record<string, AudioBuffer | null> = {};

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  if (url in bufferCache) return bufferCache[url];
  try {
    const res = await fetch(url);
    const raw = await res.arrayBuffer();
    const buf = await getCtx().decodeAudioData(raw);
    bufferCache[url] = buf;
    return buf;
  } catch {
    bufferCache[url] = null;
    return null;
  }
}

async function preloadRecordedSounds(): Promise<void> {
  if (!preloadPromise) {
    preloadPromise = Promise.all([
      loadBuffer('/sounds/yaniv.wav'),
      loadBuffer('/sounds/asaf.wav'),
    ]).then(() => undefined);
  }

  return preloadPromise;
}

function primeAudioContext(ac: AudioContext) {
  const source = ac.createBufferSource();
  source.buffer = ac.createBuffer(1, 1, 22050);
  const gain = ac.createGain();
  gain.gain.value = 0.0001;
  source.connect(gain);
  gain.connect(ac.destination);
  source.start(0);
  source.stop(ac.currentTime + 0.001);
}

export async function unlockAudio(): Promise<boolean> {
  if (!isSoundEnabled()) return false;

  if (ctx?.state === 'running') {
    void preloadRecordedSounds();
    return true;
  }

  if (unlockPromise) return unlockPromise;

  unlockPromise = (async () => {
    try {
      const ac = getCtx();
      // resume() must be initiated as early as possible; on desktop this
      // works fine from async context, on mobile the gesture-handler path
      // in installAudioUnlock handles the synchronous requirement.
      if (ac.state !== 'running') {
        await ac.resume();
      }

      if (ac.state !== 'running') {
        return false;
      }

      primeAudioContext(ac);
      void preloadRecordedSounds();
      return true;
    } catch {
      return false;
    } finally {
      unlockPromise = null;
    }
  })();

  return unlockPromise;
}

export function installAudioUnlock() {
  if (typeof window === 'undefined' || unlockListenersInstalled) return;

  unlockListenersInstalled = true;
  const events: Array<keyof WindowEventMap> = ['pointerdown', 'touchstart', 'mousedown', 'keydown'];

  const removeListeners = () => {
    events.forEach((eventName) => window.removeEventListener(eventName, onGesture, true));
  };

  const onGesture = () => {
    if (!isSoundEnabled()) return;

    // Create context and call resume synchronously within the gesture handler.
    // Mobile Safari requires AudioContext.resume() to be called in the same
    // synchronous call stack as the user gesture — async wrappers break this.
    let ac: AudioContext;
    try {
      ac = getCtx();
    } catch {
      return;
    }

    if (ac.state === 'running') {
      primeAudioContext(ac);
      void preloadRecordedSounds();
      removeListeners();
      return;
    }

    // resume() is called synchronously here (returns a Promise we then chain)
    void ac.resume().then(() => {
      if (ac.state === 'running') {
        primeAudioContext(ac);
        void preloadRecordedSounds();
        removeListeners();
      }
    });
  };

  events.forEach((eventName) => {
    window.addEventListener(eventName, onGesture, true);
  });
}

function playBuffer(buf: AudioBuffer, volumeGain = 1) {
  const ac = getCtx();
  const source = ac.createBufferSource();
  source.buffer = buf;
  const gain = ac.createGain();
  gain.gain.value = volumeGain;
  source.connect(gain);
  gain.connect(ac.destination);
  source.start();
}

async function playWhenReady(playback: () => void | Promise<void>) {
  if (!isSoundEnabled()) return;

  const unlocked = await unlockAudio();
  if (!unlocked) return;

  try {
    await playback();
  } catch {
    // ignore audio playback failures
  }
}

// ── Synthesised effects ───────────────────────────────────────────────────────

/** Soft card "flick" — quick filtered noise burst */
function synthCardDiscard() {
  const ac = getCtx();
  const now = ac.currentTime;

  // Noise source
  const bufSize = ac.sampleRate * 0.08;
  const noiseBuffer = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ac.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  noise.start(now);
  noise.stop(now + 0.08);
}

/** Soft card "whoosh" upward — draw from pile */
function synthCardDraw() {
  const ac = getCtx();
  const now = ac.currentTime;

  const bufSize = ac.sampleRate * 0.1;
  const noiseBuffer = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ac.createBufferSource();
  noise.buffer = noiseBuffer;

  const filter = ac.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.linearRampToValueAtTime(2400, now + 0.1);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  noise.start(now);
  noise.stop(now + 0.1);
}

/** Pleasant two-note chime — "your turn" */
function synthMyTurn() {
  const ac = getCtx();
  const now = ac.currentTime;

  const notes = [523.25, 783.99]; // C5 → G5
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ac.createGain();
    const t = now + i * 0.13;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}

/** Short low thud — opponent's turn / card played */
function synthOpponentPlay() {
  const ac = getCtx();
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.14);
}

/** Rising fanfare — round winner */
function synthRoundWin() {
  const ac = getCtx();
  const freqs = [523.25, 659.25, 783.99, 1046.5]; // C G E C (up)
  freqs.forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const gain = ac.createGain();
    const t = ac.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  });
}

/** Descending wah — penalty / elimination */
function synthPenalty() {
  const ac = getCtx();
  const now = ac.currentTime;

  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(330, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.45);

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, now);
  filter.frequency.exponentialRampToValueAtTime(300, now + 0.45);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.45);
}

/** Triumphant multi-note arpeggio — game over (winner) */
function synthGameWin() {
  const ac = getCtx();
  const freqs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  freqs.forEach((freq, i) => {
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const gain = ac.createGain();
    const t = ac.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.6);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export function playYaniv() {
  void playWhenReady(async () => {
    const buf = await loadBuffer('/sounds/yaniv.wav');
    if (buf) playBuffer(buf, 1.0);
  });
}

export function playAsaf() {
  void playWhenReady(async () => {
    const buf = await loadBuffer('/sounds/asaf.wav');
    if (buf) playBuffer(buf, 1.0);
  });
}

export function playCardDiscard() {
  void playWhenReady(() => { synthCardDiscard(); });
}

export function playCardDraw() {
  void playWhenReady(() => { synthCardDraw(); });
}

export function playMyTurn() {
  void playWhenReady(() => { synthMyTurn(); });
}

export function playOpponentPlay() {
  void playWhenReady(() => { synthOpponentPlay(); });
}

export function playRoundWin() {
  void playWhenReady(() => { synthRoundWin(); });
}

export function playPenalty() {
  void playWhenReady(() => { synthPenalty(); });
}

export function playGameWin() {
  void playWhenReady(() => { synthGameWin(); });
}
