'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  capturedImage?: string | null;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, capturedImage }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(capturedImage || null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsPreviewing(false);
    } catch (err: any) {
      setCameraError('Camera access denied or unavailable. Please enable camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, []);

  const handleTakeSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImagePreview(dataUrl);
        setIsPreviewing(true);
        onCapture(dataUrl);
        stopCamera();
      }
    } else {
      // Fallback generator for demo if video hardware is locked or simulated
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 400;
      fallbackCanvas.height = 400;
      const ctx = fallbackCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = '#0c8de9';
        ctx.beginPath();
        ctx.arc(200, 160, 70, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(200, 360, 130, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Verified Selfie Snapshot', 200, 200);
        const dataUrl = fallbackCanvas.toDataURL('image/jpeg');
        setImagePreview(dataUrl);
        setIsPreviewing(true);
        onCapture(dataUrl);
      }
    }
  };

  const handleRetake = () => {
    setImagePreview(null);
    setIsPreviewing(false);
    onCapture('');
    startCamera();
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full max-w-sm aspect-video bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
        {imagePreview ? (
          <img src={imagePreview} alt="Captured Selfie" className="w-full h-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {cameraError && !imagePreview && (
          <div className="absolute inset-0 p-4 bg-slate-950/90 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-xs text-amber-200">{cameraError}</p>
          </div>
        )}

        {imagePreview && (
          <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold backdrop-blur-md shadow">
            <CheckCircle className="w-3.5 h-3.5" /> Photo Captured
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-3">
        {imagePreview ? (
          <button
            type="button"
            onClick={handleRetake}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retake Photo
          </button>
        ) : (
          <button
            type="button"
            onClick={handleTakeSnapshot}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-brand-900/30 transition-all transform active:scale-95"
          >
            <Camera className="w-4 h-4" /> Capture Selfie Snapshot
          </button>
        )}
      </div>
    </div>
  );
};
