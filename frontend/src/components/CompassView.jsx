import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Navigation2 } from "lucide-react";
import { CompassNeedle } from "@/components/icons/CompassNeedle";
import DestinationPill from "@/components/DestinationPill";
import {
    haversineMeters,
    initialBearing,
    cardinal,
    etaSecondsFromDistance,
    formatDistance,
    formatDuration,
} from "@/lib/geo";
import { useApp } from "@/lib/AppState";
import { haptics } from "@/lib/haptics";

export default function CompassView({ onCancel }) {
    const {
        userLocation,
        destination,
        selectedCategory,
        heading,
        requestOrientation,
        orientationPermission,
        units,
        travelMode,
    } = useApp();

    const [showOrientPrompt, setShowOrientPrompt] = useState(false);
    const proximityRef = useRef({ at100: false, at25: false });

    useEffect(() => {
        if (orientationPermission === "unknown") {
            // On iOS this needs to be triggered by a user gesture, so we prompt.
            setShowOrientPrompt(true);
        }
    }, [orientationPermission]);

    const { distance, bearing, etaSec, bearingLabel } = useMemo(() => {
        if (!userLocation || !destination)
            return { distance: null, bearing: null, etaSec: null, bearingLabel: "—" };
        const d = haversineMeters(userLocation, destination);
        const b = initialBearing(userLocation, destination);
        const eta = etaSecondsFromDistance(
            d,
            travelMode,
            userLocation.speed || 0,
        );
        return {
            distance: d,
            bearing: b,
            etaSec: eta,
            bearingLabel: cardinal(b),
        };
    }, [userLocation, destination, travelMode]);

    // Proximity-driven haptic cues — fired once each as the user nears arrival.
    useEffect(() => {
        if (distance == null) return;
        if (!proximityRef.current.at100 && distance <= 100) {
            proximityRef.current.at100 = true;
            haptics.soft();
        }
        if (!proximityRef.current.at25 && distance <= 25) {
            proximityRef.current.at25 = true;
            haptics.arrive();
        }
    }, [distance]);

    // Needle rotation: bearing relative to device heading.
    const deviceHeading = heading || 0;
    const needleRotation =
        bearing != null ? ((bearing - deviceHeading + 540) % 360) - 180 : 0;
    const ringRotation = -deviceHeading;

    const ticks = useMemo(() => {
        const arr = [];
        for (let i = 0; i < 36; i++) arr.push(i);
        return arr;
    }, []);

    return (
        <div
            data-testid="compass-view"
            className="relative flex h-[100dvh] w-full flex-col items-center px-6 pt-safe pb-32 tg-no-select"
        >
            <div className="tg-ambient" />

            {/* Destination pill, anchored top */}
            <div className="relative z-20 mt-4 flex w-full justify-center">
                <DestinationPill
                    category={selectedCategory}
                    destination={destination}
                    distance={distance}
                    units={units}
                    anchor="top"
                />
            </div>

            {/* Compass rose */}
            <div className="relative z-10 my-auto flex h-[320px] w-[320px] items-center justify-center">
                {/* outer faint ring */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background:
                            "radial-gradient(closest-side, rgba(16,185,129,0.05), transparent 70%)",
                    }}
                />
                <div className="absolute inset-2 rounded-full border border-white/[0.06]" />
                <div className="absolute inset-8 rounded-full border border-white/[0.04]" />

                {/* Tick marks (rotated with heading) */}
                <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: ringRotation }}
                    transition={{ type: "spring", stiffness: 80, damping: 20 }}
                >
                    {ticks.map((i) => (
                        <div
                            key={i}
                            className={`tg-tick ${i % 9 === 0 ? "tg-tick--major" : ""}`}
                            style={{ transform: `translateX(-50%) rotate(${i * 10}deg)` }}
                        />
                    ))}
                    {/* Cardinal labels */}
                    {[
                        { l: "N", a: 0 },
                        { l: "E", a: 90 },
                        { l: "S", a: 180 },
                        { l: "W", a: 270 },
                    ].map(({ l, a }) => (
                        <div
                            key={l}
                            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-[0.3em]"
                            style={{
                                transform: `translate(-50%, -50%) rotate(${a}deg) translateY(-138px) rotate(${-a}deg)`,
                                color:
                                    l === "N"
                                        ? "rgba(16,185,129,0.9)"
                                        : "rgba(255,255,255,0.45)",
                            }}
                        >
                            {l}
                        </div>
                    ))}
                </motion.div>

                {/* Needle */}
                <motion.div
                    className="absolute"
                    animate={{ rotate: needleRotation }}
                    transition={{ type: "spring", stiffness: 90, damping: 18 }}
                    style={{ transformOrigin: "50% 50%" }}
                >
                    <CompassNeedle
                        size={260}
                        accent={selectedCategory?.accent || "#10B981"}
                    />
                </motion.div>
            </div>

            {/* Stats */}
            <div className="relative z-10 mb-4 flex flex-col items-center gap-1.5">
                <div
                    data-testid="compass-distance"
                    className="text-[56px] font-black leading-none tracking-tighter text-white"
                >
                    {formatDistance(distance, units)}
                </div>
                <div className="flex items-center gap-3 text-[13px] font-medium text-white/55">
                    <span data-testid="compass-eta">
                        {formatDuration(etaSec)}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span data-testid="compass-bearing">
                        {bearing != null ? `${Math.round(bearing)}° ${bearingLabel}` : "—"}
                    </span>
                </div>
            </div>

            {/* Cancel */}
            <button
                data-testid="compass-cancel"
                onClick={() => {
                    haptics.tap();
                    onCancel?.();
                }}
                className="relative z-10 mb-2 flex h-11 items-center gap-2 rounded-full px-4 text-[12px] font-semibold tracking-wide text-white/55 tg-glass active:scale-95"
            >
                <X size={14} strokeWidth={1.8} />
                End session
            </button>

            {showOrientPrompt && orientationPermission === "unknown" && (
                <div className="fixed inset-0 z-40 flex items-end justify-center px-5 pb-32">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-sm rounded-3xl p-5 tg-glass-strong"
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                                <Navigation2 size={16} />
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-white">
                                    Use device compass?
                                </div>
                                <div className="mt-1 text-xs leading-relaxed text-white/55">
                                    The needle points toward your destination
                                    using your phone's magnetometer.
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button
                                data-testid="orient-allow"
                                onClick={async () => {
                                    haptics.tap();
                                    await requestOrientation();
                                    setShowOrientPrompt(false);
                                }}
                                className="flex-1 rounded-full bg-emerald-500/90 px-4 py-2.5 text-sm font-semibold text-black active:scale-[0.98]"
                            >
                                Allow
                            </button>
                            <button
                                data-testid="orient-skip"
                                onClick={() => {
                                    haptics.tap();
                                    setShowOrientPrompt(false);
                                }}
                                className="rounded-full px-4 py-2.5 text-sm font-medium text-white/55"
                            >
                                Not now
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
