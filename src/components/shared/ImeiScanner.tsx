'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CheckCircle2, Loader2, ScanBarcode, X } from 'lucide-react';
import { extractImeis } from '@/lib/imei';

/**
 * Reads an IMEI from the barcode or QR code on a phone's box or sticker, with
 * the phone's back camera or a PC webcam.
 *
 * Only a number that passes the IMEI check digit is accepted, so the box's
 * other barcodes (serial number, EAN) and partial reads are ignored. When one
 * code holds two IMEIs (dual-SIM QR codes), the user picks which one.
 *
 * The camera works only on https (or localhost), which production uses.
 */

type Controls = { stop: () => void };

export function ImeiScanButton({ onScan, label = 'Scan' }: { onScan: (imei: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-white px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:px-3"
        title="Scan the IMEI barcode or QR code with the camera"
        aria-label={label}
      >
        <ScanBarcode className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </button>
      {open &&
        typeof document !== 'undefined' &&
        // Rendered on <body>: a parent card with a transform or overflow would
        // otherwise clip the fixed overlay and hide the dialog.
        createPortal(
          <ImeiScannerDialog
            onClose={() => setOpen(false)}
            onScan={(imei) => {
              onScan(imei);
              setOpen(false);
            }}
          />,
          document.body,
        )}
    </>
  );
}

export default function ImeiScannerDialog({ onScan, onClose }: { onScan: (imei: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[] | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState<string | undefined>(undefined);
  // Held in a ref so a new callback from the parent does not restart the camera.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setStatus('starting');
      setError(null);
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setStatus('error');
        setError('The camera only works on a secure (https) address.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setError('This browser cannot use the camera. Type the IMEI instead.');
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
          BarcodeFormat.ITF,
          BarcodeFormat.QR_CODE,
          BarcodeFormat.DATA_MATRIX,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });

        const constraints: MediaStreamConstraints = {
          video: cameraId
            ? { deviceId: { exact: cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        };
        if (!videoRef.current || cancelled) return;

        const controls = await reader.decodeFromConstraints(constraints, videoRef.current, (result) => {
          if (!result || cancelled) return;
          const text = result.getText();
          const imeis = extractImeis(text);
          if (imeis.length === 1) {
            controlsRef.current?.stop();
            if (navigator.vibrate) navigator.vibrate(60);
            onScanRef.current(imeis[0]);
          } else if (imeis.length > 1) {
            controlsRef.current?.stop();
            setChoices(imeis);
          } else {
            // A barcode, but not an IMEI — usually the serial number or EAN beside it.
            setHint(`That barcode is not an IMEI (read “${text.slice(0, 24)}”). Point at the one labelled IMEI.`);
          }
        });
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStatus('scanning');

        // Camera names are only available after permission is granted.
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setCameras(devices.filter((d) => d.kind === 'videoinput'));
      } catch (err) {
        if (cancelled) return;
        const name = (err as { name?: string })?.name;
        setStatus('error');
        setError(
          name === 'NotAllowedError'
            ? 'Camera permission was refused. Allow the camera for this site in the browser settings, then try again.'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'No camera was found on this device.'
              : name === 'NotReadableError'
                ? 'The camera is in use by another app. Close it and try again.'
                : 'The camera could not be started. Type the IMEI instead.',
        );
      }
    }

    start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [cameraId]);

  // Clear the "not an IMEI" hint after a moment so it does not linger.
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 3500);
    return () => clearTimeout(t);
  }, [hint]);

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Scan IMEI">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Scan IMEI</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {choices ? (
          <div className="space-y-3 px-4 pb-5">
            <p className="text-sm text-gray-600">This code holds {choices.length} IMEIs. Choose the one to use:</p>
            {choices.map((imei, i) => (
              <button
                key={imei}
                type="button"
                onClick={() => onScan(imei)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-blue-400 hover:bg-blue-50"
              >
                <span>
                  <span className="block text-xs text-gray-500">IMEI {i + 1}</span>
                  <span className="font-mono text-base font-semibold tracking-wide text-gray-900">{imei}</span>
                </span>
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="relative aspect-[4/3] w-full bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              {status === 'scanning' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-[38%] w-[82%] rounded-lg border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
              )}
              {status === 'starting' && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting camera…
                </div>
              )}
              {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-white">
                  <Camera className="h-6 w-6 text-white/70" />
                  {error}
                </div>
              )}
            </div>
            <div className="space-y-2 px-4 py-3">
              {hint ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{hint}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  Hold the barcode or QR code marked <b>IMEI</b> inside the frame, about a hand&apos;s width away. It fills in by itself.
                </p>
              )}
              {cameras.length > 1 && (
                <select
                  className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm"
                  value={cameraId ?? ''}
                  onChange={(e) => setCameraId(e.target.value || undefined)}
                  aria-label="Camera"
                >
                  <option value="">Default camera</option>
                  {cameras.map((c, i) => (
                    <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${i + 1}`}</option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
