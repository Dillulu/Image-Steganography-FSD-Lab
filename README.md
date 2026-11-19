# Image Steganography — FSD Lab (CS-301L)

Hide a secret image inside any ordinary photo with **zero visible ghosting**, and recover it cleanly in one click.

Built as a **Full Stack Development Lab (CS-301L)** semester project at **Air University, Kamra Campus**.

## Team Members
- **Hamza Tahir** — `225193`
- **Haseeb Khan** — `225199`

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, `react-dropzone`, `next-themes`, Lucide Icons |
| **Backend** | Node.js, Express 5, Multer (in-memory storage), Sharp, CORS |
| **Steganography Engine** | Adaptive 1-bit / 2-bit LSB with deterministic PRNG XOR whitening (`STG2`, > 51 dB PSNR) |

---

## Key Features
- **Zero-Ghosting Concealment:** Embeds secret image payloads using 1-bit (or adaptive 2-bit) LSB with PRNG bit-whitening so pixel values change by at most `±1` out of `255` — invisible even when zoomed in.
- **Full-Quality Secret Recovery:** Extracts the hidden image cleanly from the lossless PNG stego file without 4-bit color posterization.
- **Interactive Drag-to-Compare Slider:** Slide left and right across the original cover and generated stego image (or toggle side-by-side view).
- **Private In-Memory Processing:** All uploads are processed strictly in RAM (`multer.memoryStorage()`) with zero disk persistence.
- **Interactive Pixel-Matrix Studio UI:** Subtle cursor-reactive canvas background with Dark and Light theme support.

---

## Getting Started

### Prerequisites
- **Node.js 18+** (includes `npm`)

### 1. Start the Backend (Node.js + Express)
```bash
cd backend
npm install
npm start
```
Backend runs at `http://localhost:8000` (health check: `http://localhost:8000/health`).

### 2. Start the Frontend (Next.js + React)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

---

## API Endpoints

- `GET /health` — Backend status check.
- `POST /encode` — Accepts multipart fields `cover` and `secret` (PNG/JPG, max 10 MB). Returns lossless `stego.png` with `X-Stego-Bits` and `X-Stego-PSNR` headers.
- `POST /decode` — Accepts multipart field `stego` (PNG/JPG, max 10 MB). Returns `recovered.png` with `X-Decode-Mode` header.
