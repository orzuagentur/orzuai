"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

/** Extract high-quality JPEG frame thumbnails along a video timeline. */
export function useVideoFrameThumbs(
  videoSrc: string,
  duration: number,
  frameCount = 24,
) {
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef(0);

  const times = useMemo(() => {
    if (!(duration > 0)) return [] as number[];
    const n = Math.max(8, Math.min(frameCount, 36));
    return Array.from({ length: n }, (_, i) => {
      const t = ((i + 0.5) / n) * duration;
      return Math.min(duration - 0.05, Math.max(0.05, t));
    });
  }, [duration, frameCount]);

  useEffect(() => {
    if (!videoSrc || times.length === 0) {
      setThumbs([]);
      return;
    }
    const token = ++cancelRef.current;
    let cancelled = false;
    setBusy(true);
    setThumbs([]);

    void (async () => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = videoSrc;

      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error("filmstrip load failed"));
      }).catch(() => null);

      if (cancelled || token !== cancelRef.current) {
        video.src = "";
        return;
      }

      const canvas = document.createElement("canvas");
      const vw = video.videoWidth || 360;
      const vh = video.videoHeight || 640;
      const targetH = 110;
      const targetW = Math.max(48, Math.round((vw / vh) * targetH));
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setBusy(false);
        video.src = "";
        return;
      }

      const captured: string[] = [];
      for (const t of times) {
        if (cancelled || token !== cancelRef.current) break;
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            resolve();
          };
          video.addEventListener("seeked", onSeeked);
          try {
            video.currentTime = t;
          } catch {
            resolve();
          }
        });
        if (cancelled || token !== cancelRef.current) break;
        ctx.drawImage(video, 0, 0, targetW, targetH);
        captured.push(canvas.toDataURL("image/jpeg", 0.88));
        setThumbs([...captured]);
      }

      video.src = "";
      if (!cancelled && token === cancelRef.current) setBusy(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [videoSrc, times]);

  return { thumbs, busy, times };
}

/** Capture a single high-quality frame at the playhead. */
export function useCurrentFrameCapture(
  videoRef: RefObject<HTMLVideoElement | null>,
  current: number,
  playing: boolean,
) {
  const [frame, setFrame] = useState<string | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !(videoEl.videoWidth > 0)) return;
    const now = performance.now();
    if (playing && now - lastRef.current < 180) return;
    lastRef.current = now;

    const canvas = document.createElement("canvas");
    const vw = videoEl.videoWidth;
    const vh = videoEl.videoHeight;
    const h = 160;
    const w = Math.max(60, Math.round((vw / vh) * h));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(videoEl, 0, 0, w, h);
      setFrame(canvas.toDataURL("image/jpeg", 0.9));
    } catch {
      /* cross-origin */
    }
  }, [videoRef, current, playing]);

  return frame;
}
