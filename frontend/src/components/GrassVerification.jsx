import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Check, RotateCcw, X } from "lucide-react";
import { savePhoto } from "@/lib/db";
import { haptics } from "@/lib/haptics";
import { useApp } from "@/lib/AppState";

// On-device green detection — counts pixels whose hue is in the green range
// AND that have enough saturation. Returns the proportion (0..1).
function analyzeGreen(canvas) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const { width, height } = canvas;
    const sampleSize = Math.min(160, width);
    const sx = (width - sampleSize) / 2;
    const sy = (height - sampleSize) / 2;
    const imgData = ctx.getImageData(sx, sy, sampleSize, sampleSize);
    const data = imgData.data;
    let green = 0;
    const total = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
            g = data[i + 1],
            b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        if (delta < 20) continue; // too gray
        let hue;
        if (max === g) hue = ((b - r) / delta) * 60 + 120;
        else if (max === r) hue = (((g - b) / delta) % 6) * 60;
        else hue = ((r - g) / delta) * 60 + 240;
        if (hue < 0) hue += 360;
        const sat = max === 0 ? 0 : delta / max;
        if (hue > 70 && hue < 170 && sat > 0.18) green++;
    }
    return green / total;
}

export default function GrassVerification({ session, onComplete, onSkip }) {
    const { theme } = useApp();
    const [stage, setStage] = useState("intro"); // intro | camera | analyzing | result
    const [result, setResult] = useState(null); // { ratio, success, dataUrl }
    const [error, setError] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    };

    useEffect(() => () => stopStream(), []);

    const openCamera = async () => {
        haptics.tap();
        setError(null);
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } },
                audio: false,
            });
            streamRef.current = s;
            setStage("camera");
            // Wait for video element to mount
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                    videoRef.current.play().catch(() => { });
                }
            }, 50);
        } catch (e) {
            setError(
                "Camera unavailable. You can still finish the session.",
            );
        }
    };

    const capture = async () => {
        if (!videoRef.current) return;
        setStage("analyzing");
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 480;
        const h = video.videoHeight || 640;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, w, h);
        const ratio = analyzeGreen(canvas);
        const success = ratio > 0.18;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        // Persist regardless of result (it's the user's record).
        try {
            await savePhoto({
                id: `${Date.now()}`,
                sessionId: session?.id,
                takenAt: Date.now(),
                ratio,
                success,
                dataUrl,
            });
        } catch {
            /* ignore */
        }
        stopStream();
        setResult({ ratio, success, dataUrl });
        if (success) haptics.success();
        else haptics.warn();
        setStage("result");
    };

    const retry = async () => {
        haptics.tap();
        setResult(null);
        await openCamera();
    };

    return (
        <AnimatePresence>
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] flex items-end justify-center"
                style={{
                    background: theme === "light" ? "rgba(0,0,0,0.12)" : "rgba(8,8,10,0.65)",
                    backdropFilter: "blur(12px)"
                }}
                data-testid="grass-verification"
            >
                <motion.div
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 60, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 28 }}
                    className="relative w-full max-w-md rounded-t-[28px] p-6 tg-glass-strong"
                    style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
                >
                    <button
                        data-testid="grass-close"
                        onClick={() => {
                            haptics.tap();
                            stopStream();
                            onSkip?.();
                        }}
                        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/55"
                        aria-label="Close"
                    >
                        <X size={14} />
                    </button>

                    {stage === "intro" && (
                        <>
                            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                                Arrived
                            </div>
                            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                                Touch the grass.
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-white/55">
                                Point your camera at the ground. We'll check
                                briefly — no upload, no account.
                            </p>
                            <div className="mt-5 flex gap-2">
                                <button
                                    data-testid="grass-open-camera"
                                    onClick={openCamera}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500/90 px-4 py-3 text-sm font-bold text-black active:scale-[0.98]"
                                >
                                    <Camera size={14} strokeWidth={2.4} />
                                    Open camera
                                </button>
                                <button
                                    data-testid="grass-skip"
                                    onClick={() => {
                                        haptics.tap();
                                        stopStream();
                                        onSkip?.();
                                    }}
                                    className="rounded-full px-4 py-3 text-sm font-medium text-white/55"
                                >
                                    Skip
                                </button>
                            </div>
                            {error && (
                                <div className="mt-3 text-xs text-rose-300/80">
                                    {error}
                                </div>
                            )}
                        </>
                    )}

                    {(stage === "camera" || stage === "analyzing") && (
                        <>
                            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                                Live
                            </div>
                            <h2 className="mt-1 text-lg font-black tracking-tight text-white">
                                Center the green.
                            </h2>
                            <div className="relative mt-4 aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black">
                                <video
                                    ref={videoRef}
                                    playsInline
                                    muted
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                                <div
                                    className="pointer-events-none absolute inset-0"
                                    style={{
                                        background:
                                            "radial-gradient(60% 60% at 50% 50%, rgba(16,185,129,0.12), transparent 70%)",
                                    }}
                                />
                                <div
                                    className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-emerald-300/40"
                                    style={{
                                        boxShadow: theme === "light"
                                            ? "0 0 0 400px rgba(213, 213, 220, 0.65)"
                                            : "0 0 0 400px rgba(8, 8, 10, 0.55)"
                                    }}
                                />
                            </div>
                            <div className="mt-4 flex gap-2">
                                <button
                                    data-testid="grass-capture"
                                    disabled={stage === "analyzing"}
                                    onClick={capture}
                                    className="flex-1 rounded-full bg-emerald-500/90 px-4 py-3 text-sm font-bold text-black active:scale-[0.98] disabled:opacity-50"
                                >
                                    {stage === "analyzing" ? "Analyzing…" : "Capture"}
                                </button>
                            </div>
                        </>
                    )}

                    {stage === "result" && result && (
                        <>
                            <div
                                className={`text-[10px] font-bold uppercase tracking-[0.22em] ${result.success
                                        ? "text-emerald-300"
                                        : "text-amber-300"
                                    }`}
                            >
                                {result.success ? "Verified" : "Try again"}
                            </div>
                            <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                                {result.success
                                    ? "Grass touched."
                                    : "Not quite green enough."}
                            </h2>
                            <p className="mt-2 text-sm text-white/55">
                                Detected{" "}
                                <span className="text-white">
                                    {(result.ratio * 100).toFixed(0)}%
                                </span>{" "}
                                green coverage.
                            </p>
                            <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-white/5">
                                <img
                                    src={result.dataUrl}
                                    alt=""
                                    className="block w-full"
                                />
                            </div>
                            <div className="mt-4 flex gap-2">
                                {!result.success && (
                                    <button
                                        data-testid="grass-retry"
                                        onClick={retry}
                                        className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/10"
                                    >
                                        <RotateCcw size={14} />
                                        Retry
                                    </button>
                                )}
                                <button
                                    data-testid="grass-done"
                                    onClick={() => {
                                        haptics.tap();
                                        onComplete?.(result);
                                    }}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500/90 px-4 py-3 text-sm font-bold text-black"
                                >
                                    <Check size={14} strokeWidth={2.4} />
                                    Done
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
