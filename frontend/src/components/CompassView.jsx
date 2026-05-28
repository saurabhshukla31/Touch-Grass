import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
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

function getShortestPathAngle(current, target) {
    let diff = (target - current) % 360;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;
    return current + diff;
}

export default function CompassView({ onCancel }) {
    const {
        userLocation,
        destination,
        selectedCategory,
        subscribeHeading,
        requestOrientation,
        orientationPermission,
        units,
        travelMode,
        theme,
    } = useApp();

    const [showOrientPrompt, setShowOrientPrompt] = useState(false);
    const [isAligned, setIsAligned] = useState(false);
    const proximityRef = useRef({ at100: false, at25: false });

    useEffect(() => {
        const requiresPermission =
            typeof DeviceOrientationEvent !== "undefined" &&
            typeof DeviceOrientationEvent.requestPermission === "function";

        if (requiresPermission && orientationPermission === "unknown") {
            // On iOS this needs to be triggered by a user gesture, so we prompt.
            setShowOrientPrompt(true);
        } else if (!requiresPermission && orientationPermission === "unknown") {
            // Android and other platforms listen immediately without modal friction.
            requestOrientation();
        }
    }, [orientationPermission, requestOrientation]);

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

    const wasAlignedRef = useRef(false);
    const userLocationRef = useRef(userLocation);
    const bearingRef = useRef(bearing);
    const headingTextRef = useRef(null);
    const isAlignedRef = useRef(false);

    const ringRotationMV = useMotionValue(0);
    const ringRotationSpring = useSpring(ringRotationMV, { stiffness: 140, damping: 24 });

    const needleRotationMV = useMotionValue(0);
    const needleRotationSpring = useSpring(needleRotationMV, { stiffness: 160, damping: 22 });

    useEffect(() => {
        userLocationRef.current = userLocation;
    }, [userLocation]);

    useEffect(() => {
        bearingRef.current = bearing;
    }, [bearing]);

    // Trigger subtle haptics once alignment is correct
    useEffect(() => {
        if (isAligned && !wasAlignedRef.current) {
            haptics.soft();
            wasAlignedRef.current = true;
        } else if (!isAligned) {
            wasAlignedRef.current = false;
        }
    }, [isAligned]);

    useEffect(() => {
        const unsubscribe = subscribeHeading((h) => {
            let currentDeviceHeading = h;
            const uLoc = userLocationRef.current;
            if (
                uLoc &&
                uLoc.speed !== null &&
                uLoc.speed > 0.8 &&
                uLoc.heading !== null
            ) {
                currentDeviceHeading = uLoc.heading;
            }

            if (headingTextRef.current) {
                headingTextRef.current.textContent = `HEADING ${Math.round((currentDeviceHeading % 360 + 360) % 360)}°`;
            }

            const currentBearing = bearingRef.current;
            const targetRing = -currentDeviceHeading;
            const needleRotationRaw = currentBearing != null ? ((currentBearing - currentDeviceHeading + 540) % 360) - 180 : 0;

            ringRotationMV.set(getShortestPathAngle(ringRotationMV.get(), targetRing));
            needleRotationMV.set(getShortestPathAngle(needleRotationMV.get(), needleRotationRaw));

            const aligned = Math.abs(needleRotationRaw) < 8;
            if (aligned !== isAlignedRef.current) {
                isAlignedRef.current = aligned;
                setIsAligned(aligned);
            }
        });
        return unsubscribe;
    }, [subscribeHeading, ringRotationMV, needleRotationMV]);

    const svgTicks = useMemo(() => {
        const lines = [];
        const rOut = 146;
        for (let deg = 0; deg < 360; deg += 2) {
            let rIn = 142; // minor tick length = 4px
            let thickness = 1;
            let opacity = theme === "light" ? 0.15 : 0.2;

            if (deg % 90 === 0) {
                rIn = 130; // major tick length = 16px
                thickness = 2.2;
                opacity = theme === "light" ? 0.8 : 0.9;
            } else if (deg % 30 === 0) {
                rIn = 134; // medium-major tick length = 12px
                thickness = 1.6;
                opacity = theme === "light" ? 0.65 : 0.75;
            } else if (deg % 10 === 0) {
                rIn = 138; // medium tick length = 8px
                thickness = 1.2;
                opacity = theme === "light" ? 0.5 : 0.6;
            }

            const rad = (deg * Math.PI) / 180;
            const sin = Math.sin(rad);
            const cos = Math.cos(rad);

            const x1 = 160 + rIn * sin;
            const y1 = 160 - rIn * cos;
            const x2 = 160 + rOut * sin;
            const y2 = 160 - rOut * cos;

            lines.push({
                deg,
                x1,
                y1,
                x2,
                y2,
                thickness,
                opacity,
            });
        }
        return lines;
    }, [theme]);

    const tripleDots = useMemo(() => {
        const dots = [];
        [45, 135, 225, 315].forEach((deg) => {
            const rad = (deg * Math.PI) / 180;
            const sin = Math.sin(rad);
            const cos = Math.cos(rad);
            [90, 96, 102].forEach((r) => {
                const cx = 160 + r * sin;
                const cy = 160 - r * cos;
                const size = r === 96 ? 1.5 : 0.8;
                dots.push({ cx, cy, r: size, key: `${deg}-${r}` });
            });
        });
        return dots;
    }, []);

    return (
        <div
            data-testid="compass-view"
            className="relative flex h-[100dvh] w-full flex-col items-center px-6 pt-safe pb-28 tg-no-select"
        >
            <div className="tg-ambient" />

            {/* Destination pill, anchored top */}
            {destination && (
                <div className="absolute top-[env(safe-area-inset-top)] mt-3 left-0 right-0 z-20 flex w-full justify-center">
                    <DestinationPill
                        category={selectedCategory}
                        destination={destination}
                        distance={distance}
                        units={units}
                        anchor="top"
                        alwaysShowPlaceName={true}
                    />
                </div>
            )}

            {/* Main Compass Area (pushed down slightly) */}
            <div className="flex-1 flex flex-col items-center justify-center pt-16 w-full">
                {/* Compass rose */}
                <div className="relative z-10 flex h-[320px] w-[320px] items-center justify-center shrink-0">
                    {/* outer faint ring / ambient glow */}
                    <div
                        className="absolute inset-[-20px] rounded-full opacity-60 pointer-events-none"
                        style={{
                            background: theme === "light"
                                ? "radial-gradient(circle, rgba(var(--mode-accent-rgb), 0.05) 0%, transparent 70%)"
                                : "radial-gradient(circle, rgba(var(--mode-accent-rgb), 0.12) 0%, transparent 70%)",
                        }}
                    />

                    {/* Beautifully styled dial plate backing */}
                    <div
                        className="absolute rounded-full transition-all duration-300"
                        style={{
                            inset: "6px",
                            background: theme === "light"
                                ? "linear-gradient(135deg, #c7c7cc 0%, #b8b8c0 100%)"
                                : "linear-gradient(135deg, #0D1115 0%, #06080A 100%)",
                            border: theme === "light"
                                ? "1px solid rgba(0, 0, 0, 0.16)"
                                : "1px solid rgba(255, 255, 255, 0.08)",
                            boxShadow: theme === "light"
                                ? "0 12px 32px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.25)"
                                : "0 16px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                        }}
                    />

                    {/* Rotating Dial SVG wrapped in motion.div */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none z-10"
                        style={{ rotate: ringRotationSpring }}
                    >
                        <svg className="w-full h-full" viewBox="0 0 320 320">
                            {/* Ticks (every 2 degrees) */}
                            {svgTicks.map((tick) => (
                                <line
                                    key={tick.deg}
                                    x1={tick.x1}
                                    y1={tick.y1}
                                    x2={tick.x2}
                                    y2={tick.y2}
                                    stroke={theme === "light" ? `rgba(0, 0, 0, ${tick.opacity})` : `rgba(255, 255, 255, ${tick.opacity})`}
                                    strokeWidth={tick.thickness}
                                />
                            ))}

                            {/* Cardinal Letters (N, E, S, W) */}
                            {/* N (mode highlight & glow in dark mode) */}
                            <text
                                x="160"
                                y="48"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill="var(--mode-accent)"
                                className="font-black select-none text-[15px]"
                                style={{
                                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                    letterSpacing: "0.05em",
                                    filter: theme === "light" ? "none" : "drop-shadow(0 0 5px var(--mode-accent))"
                                }}
                            >
                                N
                            </text>
                            {/* E */}
                            <text
                                x="272"
                                y="160"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={theme === "light" ? "rgba(28, 28, 30, 0.8)" : "rgba(255, 255, 255, 0.9)"}
                                className="font-black select-none text-[14px]"
                                style={{
                                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                    letterSpacing: "0.05em"
                                }}
                            >
                                E
                            </text>
                            {/* S */}
                            <text
                                x="160"
                                y="272"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={theme === "light" ? "rgba(28, 28, 30, 0.8)" : "rgba(255, 255, 255, 0.9)"}
                                className="font-black select-none text-[14px]"
                                style={{
                                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                    letterSpacing: "0.05em"
                                }}
                            >
                                S
                            </text>
                            {/* W */}
                            <text
                                x="48"
                                y="160"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={theme === "light" ? "rgba(28, 28, 30, 0.8)" : "rgba(255, 255, 255, 0.9)"}
                                className="font-black select-none text-[14px]"
                                style={{
                                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                    letterSpacing: "0.05em"
                                }}
                            >
                                W
                            </text>

                            {/* Ordinal Letters (NE, SE, SW, NW) */}
                            <text
                                x="239"
                                y="81"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={theme === "light" ? "rgba(28, 28, 30, 0.45)" : "rgba(255, 255, 255, 0.45)"}
                                className="font-bold select-none text-[10px]"
                                style={{
                                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                }}
                            >
                                NE
                            </text>
                            <text
                                x="239"
                                y="239"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={theme === "light" ? "rgba(28, 28, 30, 0.45)" : "rgba(255, 255, 255, 0.45)"}
                                className="font-bold select-none text-[10px]"
                                style={{
                                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                }}
                            >
                                SE
                            </text>
                            <text
                                x="81"
                                y="239"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={theme === "light" ? "rgba(28, 28, 30, 0.45)" : "rgba(255, 255, 255, 0.45)"}
                                className="font-bold select-none text-[10px]"
                                style={{
                                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                }}
                            >
                                SW
                            </text>
                            <text
                                x="81"
                                y="81"
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={theme === "light" ? "rgba(28, 28, 30, 0.45)" : "rgba(255, 255, 255, 0.45)"}
                                className="font-bold select-none text-[10px]"
                                style={{
                                    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                }}
                            >
                                NW
                            </text>

                            {/* Inner Dotted Circle */}
                            <circle
                                cx="160"
                                cy="160"
                                r="96"
                                fill="none"
                                stroke={theme === "light" ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.2)"}
                                strokeWidth="1.5"
                                strokeDasharray="1.5, 4.5"
                            />

                            {/* Triple dot markers */}
                            {tripleDots.map((dot) => (
                                <circle
                                    key={dot.key}
                                    cx={dot.cx}
                                    cy={dot.cy}
                                    r={dot.r}
                                    fill={theme === "light" ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.3)"}
                                />
                            ))}

                            {/* Inner Concentric Rings */}
                            <circle
                                cx="160"
                                cy="160"
                                r="64"
                                fill="none"
                                stroke={theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)"}
                                strokeWidth="0.75"
                            />
                            <circle
                                cx="160"
                                cy="160"
                                r="32"
                                fill="none"
                                stroke={theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)"}
                                strokeWidth="0.75"
                            />

                            {/* Crosshair reticles with center gap */}
                            <line x1="160" y1="64" x2="160" y2="144" stroke={theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)"} strokeWidth="0.75" />
                            <line x1="160" y1="176" x2="160" y2="256" stroke={theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)"} strokeWidth="0.75" />
                            <line x1="64" y1="160" x2="144" y2="160" stroke={theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)"} strokeWidth="0.75" />
                            <line x1="176" y1="160" x2="256" y2="160" stroke={theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.06)"} strokeWidth="0.75" />
                        </svg>
                    </motion.div>

                    {/* Static Bezel & Cyan Pointers */}
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none z-20"
                        viewBox="0 0 320 320"
                    >
                        <defs>
                            <filter id="cyan-glow" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="3.5" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Outer bezel ring */}
                        <circle
                            cx="160"
                            cy="160"
                            r="154"
                            fill="none"
                            stroke={theme === "light" ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.08)"}
                            strokeWidth="1.5"
                        />

                        {/* Middle bezel ring */}
                        <circle
                            cx="160"
                            cy="160"
                            r="150"
                            fill="none"
                            stroke={theme === "light" ? "rgba(0, 0, 0, 0.035)" : "rgba(255, 255, 255, 0.05)"}
                            strokeWidth="1"
                        />

                        {/* Inner bezel ring */}
                        <circle
                            cx="160"
                            cy="160"
                            r="146"
                            fill="none"
                            stroke={theme === "light" ? "rgba(0, 0, 0, 0.025)" : "rgba(255, 255, 255, 0.04)"}
                            strokeWidth="1"
                        />

                        {/* Mode Arrowhead Pointer at the top (12 o'clock) pointing down */}
                        <polygon
                            points="160,16 153.5,6 166.5,6"
                            fill="var(--mode-accent)"
                            filter={theme === "light" ? "none" : "url(#cyan-glow)"}
                        />

                        {/* Mode axis indicators at 3, 6, 9 o'clock */}
                        {/* W (9 o'clock) */}
                        <line
                            x1="6"
                            y1="160"
                            x2="15"
                            y2="160"
                            stroke="var(--mode-accent)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            filter={theme === "light" ? "none" : "url(#cyan-glow)"}
                        />
                        {/* E (3 o'clock) */}
                        <line
                            x1="305"
                            y1="160"
                            x2="314"
                            y2="160"
                            stroke="var(--mode-accent)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            filter={theme === "light" ? "none" : "url(#cyan-glow)"}
                        />
                        {/* S (6 o'clock) */}
                        <line
                            x1="160"
                            y1="305"
                            x2="160"
                            y2="314"
                            stroke="var(--mode-accent)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            filter={theme === "light" ? "none" : "url(#cyan-glow)"}
                        />
                    </svg>

                    {/* Needle */}
                    <motion.div
                        className="absolute"
                        style={{ transformOrigin: "50% 50%", rotate: needleRotationSpring }}
                    >
                        <CompassNeedle
                            size={260}
                            accent={selectedCategory?.accent || "#10B981"}
                            isAligned={isAligned}
                            theme={theme}
                        />
                    </motion.div>
                </div>

                {/* Stats */}
                <div className={`relative z-10 mt-8 mb-4 flex flex-col items-center gap-1.5 shrink-0 ${!destination ? "invisible pointer-events-none" : ""}`}>
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
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        <span ref={headingTextRef} data-testid="compass-heading">
                            HEADING —°
                        </span>
                    </div>
                </div>
            </div>

            {/* Cancel */}
            <button
                data-testid="compass-cancel"
                onClick={() => {
                    haptics.tap();
                    onCancel?.();
                }}
                className={`relative z-10 mt-auto mb-5 flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[12px] font-semibold tracking-wide text-white/55 tg-glass active:scale-95 ${!destination ? "invisible pointer-events-none" : ""}`}
            >
                <X size={14} strokeWidth={1.8} />
                End session
            </button>

            {showOrientPrompt && orientationPermission === "unknown" && (
                <div
                    className="fixed inset-0 z-40 flex items-end justify-center px-5 pb-32"
                    style={{
                        background: theme === "light" ? "rgba(213, 213, 220, 0.75)" : "rgba(8, 8, 10, 0.75)",
                        backdropFilter: "blur(14px)",
                        WebkitBackdropFilter: "blur(14px)",
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border transition-colors duration-300 ${theme === "light"
                            ? "bg-[#dcdce2] border-black/10 shadow-black/5"
                            : "bg-[#08080a] border-white/10"
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`mt-1 flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-300 ${theme === "light"
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-emerald-500/10 text-emerald-300"
                                }`}>
                                <Navigation2 size={16} />
                            </div>
                            <div className="flex-1">
                                <div className={`text-sm font-semibold transition-colors duration-300 ${theme === "light" ? "text-black" : "text-white"
                                    }`}>
                                    Use device compass?
                                </div>
                                <div className={`mt-1 text-xs leading-relaxed transition-colors duration-300 ${theme === "light" ? "text-black/55" : "text-white/55"
                                    }`}>
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
                                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold active:scale-[0.98] transition-colors duration-300 ${theme === "light"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-emerald-500/90 text-black"
                                    }`}
                            >
                                Allow
                            </button>
                            <button
                                data-testid="orient-skip"
                                onClick={() => {
                                    haptics.tap();
                                    setShowOrientPrompt(false);
                                }}
                                className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-300 ${theme === "light"
                                    ? "text-black/55"
                                    : "text-white/55"
                                    }`}
                            >
                                Not now
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            {!destination && (
                <div
                    className="absolute inset-x-4 z-30 flex justify-center"
                    style={{
                        bottom: "calc(env(safe-area-inset-bottom, 0px) + 98px)",
                    }}
                >
                    <div className="w-full max-w-sm p-5 rounded-3xl tg-glass text-center">
                        <h3 className="text-base font-black tracking-tight leading-snug text-white">
                            Go to the <span className="text-emerald-500 font-black">Home Tab</span>
                        </h3>
                        <p className="mt-1.5 text-xs font-semibold leading-relaxed text-white/55">
                            Choose a category to get started and begin tracking.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
