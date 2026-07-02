const MULAW_DECODE_TABLE = (() => {
  const table = new Int16Array(256);

  for (let index = 0; index < 256; index += 1) {
    let mu = ~index;
    const sign = mu & 0x80;
    const exponent = (mu >> 4) & 0x07;
    const mantissa = mu & 0x0f;
    let sample = ((mantissa << 3) + 0x84) << exponent;
    sample -= 0x84;
    table[index] = sign ? 0x84 - sample : sample - 0x84;
  }

  return table;
})();

export function decodeMulawByte(byte: number): number {
  return (MULAW_DECODE_TABLE[byte & 0xff] ?? 0) / 32768;
}

export function decodeMulawToFloat32(buffer: Uint8Array): Float32Array {
  const output = new Float32Array(buffer.byteLength);

  for (let index = 0; index < buffer.byteLength; index += 1) {
    output[index] = decodeMulawByte(buffer[index] ?? 0);
  }

  return output;
}
