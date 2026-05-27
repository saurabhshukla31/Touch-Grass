import React, { useId } from "react";
import { motion } from "framer-motion";

/**
 * A ultra-high performance slim compass needle.
 * Painted in two halves: brilliant brand accent above origin, muted coordinate tracking below.
 */
export const CompassNeedle = ({ size = 220, accent = "#10B981", isAligned = false, theme = "dark" }) => {
    const uniqueId = useId();
    const needleUpId = `tg-needle-up-${uniqueId}`;
    const needleCoreId = `tg-needle-core-${uniqueId}`;

    return (
        <svg
            width={size}
            height={size}
            viewBox="-50 -120 100 240"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={needleUpId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity="1" />
                    <stop offset="100%" stopColor={accent} stopOpacity={isAligned ? "0.8" : "0.4"} />
                </linearGradient>
                <radialGradient id={needleCoreId} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={theme === "light" ? "#1c1c1e" : "#ffffff"} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={theme === "light" ? "#1c1c1e" : "#ffffff"} stopOpacity="0" />
                </radialGradient>
            </defs>

            {/* Upper Pointer Half — Hardware accelerated brand accent path */}
            <motion.polygon
                points="0,-110 8,0 -8,0"
                fill={`url(#${needleUpId})`}
                stroke={accent}
                strokeWidth="0.5"
                animate={{
                    opacity: isAligned ? 1 : 0.85,
                    filter: isAligned ? `drop-shadow(0 0 12px ${accent})` : "drop-shadow(0 0 0px rgba(0,0,0,0))"
                }}
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
            />

            {/* Lower Tail Half — Muted structural trace */}
            <polygon
                points="0,80 6,0 -6,0"
                fill={theme === "light" ? "rgba(0, 0, 0, 0.18)" : "rgba(255, 255, 255, 0.2)"}
                stroke={theme === "light" ? "rgba(0, 0, 0, 0.25)" : "rgba(255, 255, 255, 0.25)"}
                strokeWidth="0.5"
            />

            {/* Variable Instrumental Core Glow Ring */}
            <motion.circle
                cx="0"
                cy="0"
                fill={`url(#${needleCoreId})`}
                animate={{
                    r: isAligned ? 18 : 14
                }}
                transition={{ type: "spring", stiffness: 140, damping: 22 }}
            />

            {/* Center Axis Pin — Tactile pop effect matches physical haptics */}
            <motion.circle
                cx="0"
                cy="0"
                r="4"
                fill={theme === "light" ? "#1c1c1e" : "#ffffff"}
                animate={{
                    scale: isAligned ? [1, 2, 1] : 1,
                    opacity: isAligned ? 1 : 0.9
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
            />
        </svg>
    );
};

export default CompassNeedle;