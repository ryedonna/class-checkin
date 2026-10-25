'use client';

import jsQR from 'jsqr';
import { useEffect, useRef } from 'react';

type Props = {
  onDetect: (text: string) => void;
  onError: () => void;
};

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

const REPEAT_WINDOW_MS = 4000; // same code held in view is only reported once
const MAX_SCAN_WIDTH = 640; // downscale frames for the jsQR fallback

export default function CameraScanner({ onDetect, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectRef = useRef(onDetect);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onDetectRef.current = onDetect;
    onErrorRef.current = onError;
  }, [onDetect, onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let lastText = '';
    let lastTime = 0;

    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const emit = (text: string) => {
      const now = Date.now();
      if (text === lastText && now - lastTime < REPEAT_WINDOW_MS) return;
      lastText = text;
      lastTime = now;
      onDetectRef.current(text);
    };

    const tick = async () => {
      if (cancelled) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        try {
          if (detector) {
            const codes = await detector.detect(video);
            if (codes[0]) emit(codes[0].rawValue);
          } else if (ctx) {
            const scale = Math.min(1, MAX_SCAN_WIDTH / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height);
            if (code) emit(code.data);
          }
        } catch {
          /* a bad frame is not fatal */
        }
      }
      raf = requestAnimationFrame(() => void tick());
    };

    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        video.srcObject = s;
        await video.play();
        void tick();
      } catch {
        if (!cancelled) onErrorRef.current();
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, []);

  return (
    <div className="viewfinder">
      <video ref={videoRef} playsInline muted />
      <div className="frame" />
    </div>
  );
}
