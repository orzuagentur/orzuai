"use client";

let ringbackTimer: ReturnType<typeof setInterval> | null = null;
let ringbackContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextCtor =
    window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  return AudioContextCtor ? new AudioContextCtor() : null;
}

function playRingbackBurst(context: AudioContext): void {
  const gain = context.createGain();
  gain.gain.value = 0.05;
  gain.connect(context.destination);

  for (const frequency of [440, 480]) {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.connect(gain);
    oscillator.start();
    oscillator.stop(context.currentTime + 1.2);
  }
}

export function startOutboundRingback(): void {
  stopOutboundRingback();

  const context = getAudioContext();
  if (!context) {
    return;
  }

  ringbackContext = context;
  playRingbackBurst(context);
  ringbackTimer = setInterval(() => {
    if (ringbackContext) {
      playRingbackBurst(ringbackContext);
    }
  }, 4000);
}

export function stopOutboundRingback(): void {
  if (ringbackTimer) {
    clearInterval(ringbackTimer);
    ringbackTimer = null;
  }

  if (ringbackContext) {
    void ringbackContext.close().catch(() => {});
    ringbackContext = null;
  }
}

export function playCallDisconnectedTone(): void {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.06, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
  gain.connect(context.destination);

  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(620, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(320, context.currentTime + 0.3);
  oscillator.connect(gain);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.35);
  oscillator.addEventListener("ended", () => {
    void context.close().catch(() => {});
  });
}
