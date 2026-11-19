import express from "express";
import cors from "cors";
import multer from "multer";
import { encodeImage, decodeImage } from "./steganography.js";

const app = express();
const PORT = process.env.PORT || 8000;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg"]);

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "OPTIONS"],
    exposedHeaders: ["X-Stego-Bits", "X-Stego-PSNR", "X-Decode-Mode"],
  })
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
});

function validateFile(file, label) {
  if (!file) {
    return `${label} upload karna zaroori hai.`;
  }
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    return "Sirf PNG ya JPG images upload ki ja sakti hain.";
  }
  if (file.size > MAX_SIZE) {
    return "Image ka size 10 MB se zyada nahi hona chahiye.";
  }
  return null;
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    backend: "Node.js + Express",
    engine: "Zero-Ghosting Adaptive LSB (STG2)",
  });
});

app.post(
  "/encode",
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "secret", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const coverFile = req.files?.cover?.[0];
      const secretFile = req.files?.secret?.[0];

      const coverErr = validateFile(coverFile, "Cover image");
      if (coverErr) return res.status(400).json({ detail: coverErr });

      const secretErr = validateFile(secretFile, "Secret image");
      if (secretErr) return res.status(400).json({ detail: secretErr });

      const { buffer, meta } = await encodeImage(coverFile.buffer, secretFile.buffer);

      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", "attachment; filename=stego.png");
      res.setHeader("X-Stego-Bits", String(meta.bitsPerChannel));
      res.setHeader("X-Stego-PSNR", String(meta.psnrDb));
      return res.send(buffer);
    } catch (err) {
      return res.status(400).json({
        detail: err?.message || "Image hide karne mein masla aaya.",
      });
    }
  }
);

app.post("/decode", upload.single("stego"), async (req, res) => {
  try {
    const stegoFile = req.file;
    const stegoErr = validateFile(stegoFile, "Stego image");
    if (stegoErr) return res.status(400).json({ detail: stegoErr });

    const { buffer, meta } = await decodeImage(stegoFile.buffer);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=recovered.png");
    res.setHeader("X-Decode-Mode", meta.mode);
    return res.send(buffer);
  } catch {
    return res.status(400).json({
      detail: "Is image mein koi hidden data nahi mila ya image corrupt ho chuki hai.",
    });
  }
});

// Handle Multer errors (e.g. file too large)
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      detail: "Image ka size 10 MB se zyada nahi hona chahiye.",
    });
  }
  return res.status(500).json({ detail: err?.message || "Server error." });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Node.js Express backend running on http://127.0.0.1:${PORT}`);
});
