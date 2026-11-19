/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  EyeOff,
  ImagePlus,
  Loader2,
  RotateCcw,
  ScanEye,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PixelFieldBackground } from "@/components/pixel-field-bg";
import { CompareViewer } from "@/components/compare-slider";

const API = "http://localhost:8000";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function DropZone({
  title,
  hint,
  onFile,
  file,
}: {
  title: string;
  hint: string;
  onFile: (f: File | null) => void;
  file: File | null;
}) {
  const [dims, setDims] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [".png", ".jpg", ".jpeg"] },
    multiple: false,
    onDrop: ([f]) => {
      if (f) {
        setDims(null);
        onFile(f);
      }
    },
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {file && (
          <button
            type="button"
            onClick={() => {
              setDims(null);
              onFile(null);
            }}
            className="pressable inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      <div
        {...getRootProps()}
        className={`group relative flex min-h-[212px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors duration-150 ${
          isDragActive
            ? "border-primary bg-primary/8"
            : file
            ? "border-primary/45 bg-muted/25 hover:border-primary/70"
            : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/35"
        }`}
      >
        <input {...getInputProps()} />
        {file && previewUrl ? (
          <div className="w-full space-y-2.5">
            <img
              src={previewUrl}
              alt={`${title} preview`}
              onLoad={(e) => {
                const img = e.currentTarget;
                setDims(`${img.naturalWidth} × ${img.naturalHeight}`);
              }}
              className="mx-auto max-h-40 rounded-lg object-contain"
            />
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
              <span className="max-w-[180px] truncate font-medium text-foreground">
                {file.name}
              </span>
              <span className="font-mono tabular-nums">
                {formatBytes(file.size)}
              </span>
              {dims && <span className="font-mono tabular-nums">{dims}</span>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background/80 text-primary transition-transform duration-150 group-hover:scale-105">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {isDragActive ? "Drop image right here" : hint}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG or JPG, up to 10 MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [cover, setCover] = useState<File | null>(null);
  const [secret, setSecret] = useState<File | null>(null);
  const [stego, setStego] = useState<string | null>(null);
  const [stegoBlob, setStegoBlob] = useState<Blob | null>(null);
  const [encodeMeta, setEncodeMeta] = useState<{
    bits: string;
    psnr: string;
  } | null>(null);

  const [stegoInput, setStegoInput] = useState<File | null>(null);
  const [recovered, setRecovered] = useState<string | null>(null);
  const [recoveredBlob, setRecoveredBlob] = useState<Blob | null>(null);
  const [decodeMode, setDecodeMode] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [stegoInputUrl, setStegoInputUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!cover) {
      setCoverUrl(null);
      return;
    }
    const url = URL.createObjectURL(cover);
    setCoverUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [cover]);

  useEffect(() => {
    if (!stegoInput) {
      setStegoInputUrl(null);
      return;
    }
    const url = URL.createObjectURL(stegoInput);
    setStegoInputUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [stegoInput]);

  const handleEncode = async () => {
    if (!cover || !secret) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("cover", cover);
      form.append("secret", secret);
      const res = await fetch(`${API}/encode`, { method: "POST", body: form });
      if (!res.ok) {
        let msg = "Could not hide the image. Please try again.";
        try {
          const j = await res.json();
          if (j?.detail) msg = j.detail;
        } catch {
          msg = await res.text();
        }
        throw new Error(msg);
      }
      const bits = res.headers.get("X-Stego-Bits") || "1";
      const psnr = res.headers.get("X-Stego-PSNR") || "51.0";
      const blob = await res.blob();
      if (stego) URL.revokeObjectURL(stego);
      setStegoBlob(blob);
      setStego(URL.createObjectURL(blob));
      setEncodeMeta({ bits, psnr });
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Connection failed. Make sure the backend server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDecode = async () => {
    if (!stegoInput) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("stego", stegoInput);
      const res = await fetch(`${API}/decode`, { method: "POST", body: form });
      if (!res.ok) {
        let msg = "Could not reveal a hidden image from this file.";
        try {
          const j = await res.json();
          if (j?.detail) msg = j.detail;
        } catch {
          msg = await res.text();
        }
        throw new Error(msg);
      }
      const mode = res.headers.get("X-Decode-Mode") || "STG2-1bit";
      const blob = await res.blob();
      if (recovered) URL.revokeObjectURL(recovered);
      setRecoveredBlob(blob);
      setRecovered(URL.createObjectURL(blob));
      setDecodeMode(mode);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Connection failed. Make sure the backend server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const resetEncode = () => {
    setCover(null);
    setSecret(null);
    if (stego) URL.revokeObjectURL(stego);
    setStego(null);
    setStegoBlob(null);
    setEncodeMeta(null);
    setError(null);
  };

  const resetDecode = () => {
    setStegoInput(null);
    if (recovered) URL.revokeObjectURL(recovered);
    setRecovered(null);
    setRecoveredBlob(null);
    setDecodeMode(null);
    setError(null);
  };

  return (
    <main className="relative min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <PixelFieldBackground />

      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="3"
                  width="14"
                  height="14"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.9"
                />
                <rect
                  x="9"
                  y="9"
                  width="12"
                  height="12"
                  rx="3"
                  fill="currentColor"
                  fillOpacity="0.2"
                  stroke="currentColor"
                  strokeWidth="1.9"
                />
                <circle cx="15" cy="15" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Image Steganography
              </h1>
              <p className="text-sm text-muted-foreground">
                Hide a secret image inside any photo with zero visible trace, and
                recover it cleanly in one click.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Zero-Ghosting Engine</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="text-destructive/80 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main Studio Workspace */}
        <section className="studio-surface rounded-2xl border border-border bg-card p-5 sm:p-7">
          <Tabs
            defaultValue="encode"
            onValueChange={() => setError(null)}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border">
              <TabsList className="grid w-full sm:w-[320px] grid-cols-2 h-10">
                <TabsTrigger value="encode" className="gap-2 text-sm">
                  <EyeOff className="h-4 w-4" />
                  Hide image
                </TabsTrigger>
                <TabsTrigger value="decode" className="gap-2 text-sm">
                  <ScanEye className="h-4 w-4" />
                  Reveal image
                </TabsTrigger>
              </TabsList>

              <p className="text-xs text-muted-foreground">
                Processed privately in memory — nothing is saved on disk.
              </p>
            </div>

            {/* ENCODE TAB */}
            <TabsContent value="encode" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <DropZone
                  title="1. Cover image (Visible photo)"
                  hint="Drop cover photo or click to browse"
                  onFile={(f) => {
                    setCover(f);
                    if (!f) {
                      setStego(null);
                      setStegoBlob(null);
                      setEncodeMeta(null);
                    }
                  }}
                  file={cover}
                />
                <DropZone
                  title="2. Secret image (To hide inside)"
                  hint="Drop secret image or click to browse"
                  onFile={(f) => {
                    setSecret(f);
                    if (!f) {
                      setStego(null);
                      setStegoBlob(null);
                      setEncodeMeta(null);
                    }
                  }}
                  file={secret}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="pressable flex-1 min-w-[200px] h-11 text-sm font-semibold"
                  disabled={!cover || !secret || loading}
                  onClick={handleEncode}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Hiding secret image...
                    </>
                  ) : (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Hide secret image
                    </>
                  )}
                </Button>

                {(cover || secret || stego) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="pressable h-11"
                    onClick={resetEncode}
                    disabled={loading}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                )}
              </div>

              {stego && coverUrl && (
                <div className="animate-result-reveal space-y-4 pt-5 border-t border-border">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Stego image ready</span>
                      {encodeMeta && (
                        <span className="ml-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary tabular-nums">
                          {encodeMeta.bits}-bit LSB · {encodeMeta.psnr} dB
                        </span>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="default"
                      className="pressable"
                      onClick={() =>
                        stegoBlob && download(stegoBlob, "stego.png")
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download stego.png
                    </Button>
                  </div>

                  <CompareViewer
                    beforeSrc={coverUrl}
                    afterSrc={stego}
                    beforeLabel="Original Cover"
                    afterLabel="Stego Image (Hidden Inside)"
                    allowSlider={true}
                  />
                </div>
              )}
            </TabsContent>

            {/* DECODE TAB */}
            <TabsContent value="decode" className="space-y-6 mt-0">
              <DropZone
                title="Stego image (PNG created by this tool)"
                hint="Drop stego PNG here or click to browse"
                onFile={(f) => {
                  setStegoInput(f);
                  if (!f) {
                    setRecovered(null);
                    setRecoveredBlob(null);
                    setDecodeMode(null);
                  }
                }}
                file={stegoInput}
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="pressable flex-1 min-w-[200px] h-11 text-sm font-semibold"
                  disabled={!stegoInput || loading}
                  onClick={handleDecode}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Extracting hidden image...
                    </>
                  ) : (
                    <>
                      <ScanEye className="mr-2 h-4 w-4" />
                      Reveal hidden image
                    </>
                  )}
                </Button>

                {(stegoInput || recovered) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="pressable h-11"
                    onClick={resetDecode}
                    disabled={loading}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                )}
              </div>

              {recovered && stegoInputUrl && (
                <div className="animate-result-reveal space-y-4 pt-5 border-t border-border">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>Hidden image recovered</span>
                      {decodeMode && (
                        <span className="ml-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
                          {decodeMode}
                        </span>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="default"
                      className="pressable"
                      onClick={() =>
                        recoveredBlob &&
                        download(recoveredBlob, "recovered.png")
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download recovered.png
                    </Button>
                  </div>

                  <CompareViewer
                    beforeSrc={stegoInputUrl}
                    afterSrc={recovered}
                    beforeLabel="Stego Input"
                    afterLabel="Recovered Secret Image"
                    allowSlider={false}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* Team Project Attribution Bar */}
        <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border bg-card/80 px-5 py-4 text-xs">
          <div className="flex items-center gap-2.5 text-foreground">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Team Project — Full Stack Development Lab (CS-301L)
              </p>
              <p className="text-muted-foreground">
                Air University, Kamra Campus
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 font-medium text-foreground">
              <span>Hamza Tahir</span>
              <span className="font-mono text-primary tabular-nums">
                225193
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 font-medium text-foreground">
              <span>Haseeb Khan</span>
              <span className="font-mono text-primary tabular-nums">
                225199
              </span>
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
