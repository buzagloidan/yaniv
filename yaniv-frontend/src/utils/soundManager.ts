/**
 * Sound manager for Yaniv.
 *
 * - yaniv.wav / asaf.wav  — real recordings, loaded once on demand
 * - All other effects     — synthesised via Web Audio API (no copyright)
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  // Safari sometimes suspends the context until a user gesture
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem('yaniv_sounds') !== 'off';
  } catch {
    return true;
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

// Pre-load on first import (best-effort — no throw if unavailable)
loadBuffer('/sounds/yaniv.wav').catch(() => {});
loadBuffer('/sounds/asaf.wav').catch(() => {});

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

export async function playYaniv() {
  if (!isSoundEnabled()) return;
  const buf = await loadBuffer('/sounds/yaniv.wav');
  if (buf) playBuffer(buf, 1.0);
}

export async function playAsaf() {
  if (!isSoundEnabled()) return;
  const buf = await loadBuffer('/sounds/asaf.wav');
  if (buf) playBuffer(buf, 1.0);
}

export function playCardDiscard() {
  if (!isSoundEnabled()) return;
  try { synthCardDiscard(); } catch { /* ignore */ }
}

export function playCardDraw() {
  if (!isSoundEnabled()) return;
  try { synthCardDraw(); } catch { /* ignore */ }
}

export function playMyTurn() {
  if (!isSoundEnabled()) return;
  try { synthMyTurn(); } catch { /* ignore */ }
}

export function playOpponentPlay() {
  if (!isSoundEnabled()) return;
  try { synthOpponentPlay(); } catch { /* ignore */ }
}

export function playRoundWin() {
  if (!isSoundEnabled()) return;
  try { synthRoundWin(); } catch { /* ignore */ }
}

export function playPenalty() {
  if (!isSoundEnabled()) return;
  try { synthPenalty(); } catch { /* ignore */ }
}

export function playGameWin() {
  if (!isSoundEnabled()) return;
  try { synthGameWin(); } catch { /* ignore */ }
}
