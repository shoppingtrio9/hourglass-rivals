/** Tiny WebAudio engine: procedural sound effects + a looping ambient music bed. */

let ctx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;

const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
};

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.15,
  delay = 0,
  endFreq?: number,
) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export type SfxName = "roll" | "move" | "capture" | "goal" | "win" | "tap";

export function playSfx(name: SfxName) {
  switch (name) {
    case "roll":
      for (let i = 0; i < 5; i++) tone(220 + i * 90, 0.06, "square", 0.08, i * 0.055);
      break;
    case "move":
      tone(520, 0.09, "triangle", 0.12);
      break;
    case "capture":
      tone(320, 0.35, "sawtooth", 0.14, 0, 70);
      break;
    case "goal":
      [660, 880, 1320].forEach((f, i) => tone(f, 0.22, "sine", 0.13, i * 0.09));
      break;
    case "win":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.45, "triangle", 0.14, i * 0.14));
      break;
    case "tap":
      tone(700, 0.05, "sine", 0.08);
      break;
  }
}

const CHORDS = [
  [196, 247, 294],
  [175, 220, 262],
  [147, 220, 294],
  [165, 208, 247],
];

export function startMusic() {
  const c = getCtx();
  if (!c || musicTimer !== null) return;
  musicGain = c.createGain();
  musicGain.gain.value = 0.06;
  musicGain.connect(c.destination);

  let step = 0;
  const playChord = () => {
    const g = musicGain;
    const cc = getCtx();
    if (!g || !cc) return;
    const chord = CHORDS[step % CHORDS.length]!;
    chord.forEach((freq, i) => {
      const osc = cc.createOscillator();
      const env = cc.createGain();
      const t0 = cc.currentTime;
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(0.5, t0 + 0.8);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.4);
      osc.connect(env).connect(g);
      osc.start(t0);
      osc.stop(t0 + 3.6);
    });
    step++;
  };
  playChord();
  musicTimer = window.setInterval(playChord, 3400);
}

export function stopMusic() {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicGain) {
    try {
      musicGain.gain.value = 0;
      musicGain.disconnect();
    } catch {
      /* noop */
    }
    musicGain = null;
  }
}
