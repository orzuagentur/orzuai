import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleRate = 44100;
const duration = 0.45;
const numSamples = Math.floor(sampleRate * duration);
const dataSize = numSamples * 2;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

for (let i = 0; i < numSamples; i += 1) {
  const t = i / sampleRate;
  const freq = t < 0.2 ? 880 : 1318.5;
  const envelope = Math.min(1, t * 20) * Math.max(0, 1 - (t - 0.35) * 8);
  const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.35;
  const intSample = Math.max(
    -32768,
    Math.min(32767, Math.floor(sample * 32767)),
  );
  buffer.writeInt16LE(intSample, 44 + i * 2);
}

const outDir = path.join(__dirname, "..", "public", "sounds");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "new-lead.wav"), buffer);
console.log("Wrote public/sounds/new-lead.wav");
