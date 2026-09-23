import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Upload, AlertCircle, RefreshCw, FlipHorizontal } from 'lucide-react';
import jsQR from 'jsqr';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Extract 6-digit code from any QR payload (e.g. "?code=123456", "https://.../code=123456", "123456")
  const parseTransferCode = (data: string): string | null => {
    if (!data) return null;
    const trimmed = data.trim();

    // Check for query parameter ?code=XXXXXX or &code=XXXXXX
    const matchParam = trimmed.match(/[?&]code=([0-9]{6})/i);
    if (matchParam && matchParam[1]) {
      return matchParam[1];
    }

    // Check for direct 6-digit number
    const matchDirect = trimmed.match(/\b([0-9]{6})\b/);
    if (matchDirect && matchDirect[1]) {
      return matchDirect[1];
    }

    return null;
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setErrorMsg(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Camera access is not supported on this browser or device.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        await videoRef.current.play();
        setCameraActive(true);
        scanFrame();
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Camera permission was denied. You can allow camera access or upload a QR image.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg('No camera device found on this system. You can upload a QR image instead.');
      } else {
        setErrorMsg('Could not access camera. Please upload an image with the QR code.');
      }
    }
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      const parsedCode = parseTransferCode(code.data);
      if (parsedCode) {
        stopCamera();
        onScanSuccess(parsedCode);
        onClose();
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Handle uploaded image file scanning
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMsg(null);

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setErrorMsg('Failed to process image.');
          setIsProcessingFile(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

        setIsProcessingFile(false);
        if (qrCode && qrCode.data) {
          const parsed = parseTransferCode(qrCode.data);
          if (parsed) {
            stopCamera();
            onScanSuccess(parsed);
            onClose();
          } else {
            setErrorMsg(`Found QR data: "${qrCode.data}", but could not find a 6-digit code.`);
          }
        } else {
          setErrorMsg('No readable QR code found in this image. Please try another image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="qr-scanner-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 space-y-4 relative animate-in zoom-in-95 duration-150 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-base">Scan QR Code</h3>
          </div>
          <button
            id="close-qr-scanner-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Viewfinder */}
        <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Viewfinder Target Frame Overlay */}
          {cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-teal-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                {/* Laser scan line animation */}
                <div className="absolute inset-x-0 h-0.5 bg-teal-400 shadow-[0_0_8px_#2dd4bf] animate-pulse" />
              </div>
            </div>
          )}

          {/* Fallback / Loading / Inactive UI */}
          {!cameraActive && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center text-slate-300 space-y-3">
              <Camera className="w-10 h-10 text-slate-500" />
              <p className="text-xs text-slate-400">
                {errorMsg || 'Starting camera viewfinder...'}
              </p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Status / Error Message */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="flex-1">{errorMsg}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {cameraActive && (
            <button
              id="flip-camera-btn"
              type="button"
              onClick={toggleFacingMode}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              Switch Camera
            </button>
          )}

          <button
            id="upload-qr-img-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            {isProcessingFile ? 'Reading...' : 'Upload QR Image'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
