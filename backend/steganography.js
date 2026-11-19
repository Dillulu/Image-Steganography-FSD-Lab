import sharp from "sharp";

const MAGIC = Buffer.from("STG2", "ascii");
const HEADER_SIZE = 12; // 4B magic + 1B bitsPerChannel + 4B payloadLen + 3B reserved
const HEADER_CHANNELS = HEADER_SIZE * 8; // 96 channel values (always 1-bit LSB)
const WHITEN_SEED = 0x57e60a1b;

/**
 * Deterministic PRNG XOR whitening (Mulberry32) so embedded LSB bits
 * have zero spatial outline/ghosting of the secret image.
 */
function whiten(buf) {
  const out = Buffer.allocUnsafe(buf.length);
  let state = WHITEN_SEED >>> 0;
  for (let i = 0; i < buf.length; i++) {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const randByte = ((t ^ (t >>> 14)) >>> 0) & 0xff;
    out[i] = buf[i] ^ randByte;
  }
  return out;
}

/**
 * Serialize secret image into compact, crisp bytes that fit cleanly inside
 * 1-bit LSB (preferred: max +/-1 pixel change, >51 dB PSNR) or 2-bit LSB (>44 dB PSNR).
 */
async function serializeSecretToFit(secretBuffer, cap1Bit, cap2Bit) {
  const base = sharp(secretBuffer).flatten({ background: "#000000" }).toColorspace("srgb");
  const meta = await base.metadata();

  // 1) Try lossless PNG in 1-bit capacity
  const pngBuf = await base.clone().png({ compressionLevel: 9 }).toBuffer();
  if (pngBuf.length <= cap1Bit) {
    return { payload: pngBuf, bitsPerChannel: 1 };
  }

  // 2) Try high-quality JPEG in 1-bit capacity at original resolution
  for (const quality of [92, 85, 78, 70]) {
    const jpgBuf = await base.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (jpgBuf.length <= cap1Bit) {
      return { payload: jpgBuf, bitsPerChannel: 1 };
    }
  }

  // 3) Try lossless PNG in 2-bit capacity
  if (pngBuf.length <= cap2Bit) {
    return { payload: pngBuf, bitsPerChannel: 2 };
  }

  // 4) Try high-quality JPEG in 2-bit capacity at original resolution
  for (const quality of [92, 85, 76, 68, 60]) {
    const jpgBuf = await base.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (jpgBuf.length <= cap2Bit) {
      return { payload: jpgBuf, bitsPerChannel: 2 };
    }
  }

  // 5) Gracefully downscale proportionally until it fits in 2-bit capacity
  let w = meta.width || 512;
  let h = meta.height || 512;
  while (w >= 64 && h >= 64) {
    w = Math.max(32, Math.floor(w * 0.85));
    h = Math.max(32, Math.floor(h * 0.85));
    const resized = base.clone().resize(w, h, { kernel: sharp.kernel.lanczos3 });
    for (const quality of [85, 75, 65]) {
      const jpgBuf = await resized.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
      if (jpgBuf.length <= cap2Bit) {
        return { payload: jpgBuf, bitsPerChannel: 2 };
      }
    }
  }

  throw new Error(
    "Cover image bohat chhoti hai is secret image ko chhupane ke liye. Barah-e-karam koi bari cover image upload karein."
  );
}

function computePsnr(original, modified) {
  let sumSq = 0;
  const len = original.length;
  for (let i = 0; i < len; i++) {
    const d = original[i] - modified[i];
    sumSq += d * d;
  }
  const mse = sumSq / len;
  if (mse === 0) return 99.9;
  return Number((10 * Math.log10((255 * 255) / mse)).toFixed(2));
}

export async function encodeImage(coverBuffer, secretBuffer) {
  const { data: coverRaw, info } = await sharp(coverBuffer)
    .flatten({ background: "#000000" })
    .removeAlpha()
    .toColorspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const totalChannels = coverRaw.length;
  if (totalChannels <= HEADER_CHANNELS + 1024) {
    throw new Error("Cover image ka resolution bohat chhota hai.");
  }

  const remChannels = totalChannels - HEADER_CHANNELS;
  const cap1Bit = Math.floor(remChannels / 8);
  const cap2Bit = Math.floor((remChannels * 2) / 8);

  const { payload, bitsPerChannel } = await serializeSecretToFit(
    secretBuffer,
    cap1Bit,
    cap2Bit
  );
  const whitened = whiten(payload);

  const stegoRaw = Buffer.from(coverRaw);

  // Build 12-byte header
  const header = Buffer.alloc(HEADER_SIZE, 0);
  MAGIC.copy(header, 0);
  header.writeUInt8(bitsPerChannel, 4);
  header.writeUInt32BE(whitened.length, 5);

  // Embed 12-byte header into first 96 channel values (1-bit LSB)
  let ch = 0;
  for (let i = 0; i < HEADER_SIZE; i++) {
    const byte = header[i];
    for (let bit = 7; bit >= 0; bit--) {
      stegoRaw[ch] = (stegoRaw[ch] & 0xfe) | ((byte >>> bit) & 1);
      ch++;
    }
  }

  // Embed whitened payload
  if (bitsPerChannel === 1) {
    for (let i = 0; i < whitened.length; i++) {
      const byte = whitened[i];
      for (let bit = 7; bit >= 0; bit--) {
        stegoRaw[ch] = (stegoRaw[ch] & 0xfe) | ((byte >>> bit) & 1);
        ch++;
      }
    }
  } else {
    for (let i = 0; i < whitened.length; i++) {
      const byte = whitened[i];
      stegoRaw[ch] = (stegoRaw[ch] & 0xfc) | ((byte >>> 6) & 0x03);
      stegoRaw[ch + 1] = (stegoRaw[ch + 1] & 0xfc) | ((byte >>> 4) & 0x03);
      stegoRaw[ch + 2] = (stegoRaw[ch + 2] & 0xfc) | ((byte >>> 2) & 0x03);
      stegoRaw[ch + 3] = (stegoRaw[ch + 3] & 0xfc) | (byte & 0x03);
      ch += 4;
    }
  }

  const psnrDb = computePsnr(coverRaw, stegoRaw);

  const pngOut = await sharp(stegoRaw, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return {
    buffer: pngOut,
    meta: {
      bitsPerChannel,
      psnrDb,
      payloadBytes: whitened.length,
    },
  };
}

export async function decodeImage(stegoBuffer) {
  const { data: stegoRaw, info } = await sharp(stegoBuffer)
    .flatten({ background: "#000000" })
    .removeAlpha()
    .toColorspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (stegoRaw.length > HEADER_CHANNELS) {
    // Extract 12-byte header from first 96 channels (1-bit LSB)
    const header = Buffer.alloc(HEADER_SIZE);
    let ch = 0;
    for (let i = 0; i < HEADER_SIZE; i++) {
      let byte = 0;
      for (let bit = 7; bit >= 0; bit--) {
        byte |= (stegoRaw[ch] & 1) << bit;
        ch++;
      }
      header[i] = byte;
    }

    if (header.subarray(0, 4).equals(MAGIC)) {
      const bitsPerChannel = header.readUInt8(4);
      const payloadLen = header.readUInt32BE(5);

      if (bitsPerChannel === 1 && HEADER_CHANNELS + payloadLen * 8 <= stegoRaw.length) {
        const whitened = Buffer.allocUnsafe(payloadLen);
        for (let i = 0; i < payloadLen; i++) {
          let byte = 0;
          for (let bit = 7; bit >= 0; bit--) {
            byte |= (stegoRaw[ch] & 1) << bit;
            ch++;
          }
          whitened[i] = byte;
        }
        const rawSecret = whiten(whitened);
        const pngOut = await sharp(rawSecret).png().toBuffer();
        return { buffer: pngOut, meta: { mode: "STG2-1bit" } };
      }

      if (bitsPerChannel === 2 && HEADER_CHANNELS + payloadLen * 4 <= stegoRaw.length) {
        const whitened = Buffer.allocUnsafe(payloadLen);
        for (let i = 0; i < payloadLen; i++) {
          const b =
            ((stegoRaw[ch] & 0x03) << 6) |
            ((stegoRaw[ch + 1] & 0x03) << 4) |
            ((stegoRaw[ch + 2] & 0x03) << 2) |
            (stegoRaw[ch + 3] & 0x03);
          whitened[i] = b;
          ch += 4;
        }
        const rawSecret = whiten(whitened);
        const pngOut = await sharp(rawSecret).png().toBuffer();
        return { buffer: pngOut, meta: { mode: "STG2-2bit" } };
      }
    }
  }

  // Fallback for legacy 4-bit stego images
  const recovered = Buffer.allocUnsafe(stegoRaw.length);
  for (let i = 0; i < stegoRaw.length; i++) {
    recovered[i] = (stegoRaw[i] & 0x0f) << 4;
  }
  const pngOut = await sharp(recovered, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();

  return { buffer: pngOut, meta: { mode: "legacy-4bit" } };
}
