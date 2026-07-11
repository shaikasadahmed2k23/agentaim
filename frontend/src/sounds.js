let ctx;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function tone(freq, duration, type = "sine", startDelay = 0, gain = 0.15) {
  const audioCtx = getCtx();
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gainNode.gain.value = gain;
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  const startTime = audioCtx.currentTime + startDelay;
  osc.start(startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.stop(startTime + duration);
}

// classic two-note "door open" style buddy-online blip
export function playBuddyIn() {
  tone(660, 0.12, "sine", 0);
  tone(880, 0.15, "sine", 0.1);
}

// descending blip for buddy going away/offline
export function playBuddyOut() {
  tone(880, 0.12, "sine", 0);
  tone(660, 0.15, "sine", 0.1);
}

// message received blip
export function playImReceive() {
  tone(740, 0.08, "triangle", 0);
}

// success chime for a verified/accepted trust handshake
export function playTrustAccept() {
  tone(523, 0.1, "sine", 0);
  tone(659, 0.1, "sine", 0.1);
  tone(784, 0.2, "sine", 0.2);
}

// harsh buzz for a rejected / untrusted agent
export function playTrustReject() {
  tone(180, 0.35, "sawtooth", 0, 0.12);
}

// playful synthesized "dial-up modem handshake" — a few warbling tones, not a real recording
export function playDialup() {
  const seq = [
    [420, "square", 0.0, 0.12, 0.06],
    [900, "sawtooth", 0.12, 0.15, 0.05],
    [520, "square", 0.28, 0.12, 0.06],
    [1200, "sawtooth", 0.4, 0.2, 0.05],
    [650, "square", 0.62, 0.15, 0.06],
  ];
  seq.forEach(([freq, type, delay, dur, gain]) => tone(freq, dur, type, delay, gain));
}
