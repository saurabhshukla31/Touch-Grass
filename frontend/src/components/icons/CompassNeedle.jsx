import React from "react";
import { motion } from "framer-motion";

// A slim needle, painted in two halves: bright accent above origin, muted below.
export const CompassNeedle = ({ size = 220, accent = "#10B981", isAligned = false }) => (
    <svg
        width={size}
        height={size}
        viewBox="-50 -120 100 240"
        aria-hidden="true"
    >
        <defs>
            <linearGradient id="tg-needle-up" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="1" />
                <stop offset="100%" stopColor={accent} stopOpacity={isAligned ? "0.8" : "0.4"} />
            </linearGradient>
            <radialGradient id="tg-needle-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
        </defs>
        {/* upper half — accent */}
        <polygon
            points="0,-110 8,0 -8,0"
            fill="url(#tg-needle-up)"
            stroke={accent}
            strokeWidth="0.5"
            opacity={isAligned ? "1" : "0.85"}
            style={{ filter: isAligned ? `drop-shadow(0 0 12px ${accent})` : 'none', transition: 'all 0.3s ease' }}
        />
        {/* lower half — muted */}
        <polygon
            points="0,80 6,0 -6,0"
            fill="rgba(255,255,255,0.2)"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="0.5"
        />
        {/* core glow */}
        <circle cx="0" cy="0" r={isAligned ? "18" : "14"} fill="url(#tg-needle-core)" style={{ transition: 'all 0.3s ease' }} />
        <motion.circle
            cx="0"
            cy="0"
            r="4"
            fill="#ffffff"
            animate={{ 
                scale: isAligned ? [1, 2, 1] : 1,
                opacity: isAligned ? 1 : 0.9
            }}
            transition={{ duration: 0.4 }}
        />
    </svg>
);

export default CompassNeedle;
