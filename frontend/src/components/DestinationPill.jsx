import React from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import { haptics } from "@/lib/haptics";
import { useApp } from "@/lib/AppState";

// Single button that toggles between collapsed (testid pill-collapsed) and
// expanded (testid pill-expanded) state. Using a single element avoids the
// AnimatePresence race that previously swallowed the second click.
export default function DestinationPill({
    category,
    destination,
    distance,
    units = "metric",
    anchor = "top",
    className = "",
}) {
    const { pillOpen, togglePill } = useApp();
    const open = pillOpen;
    if (!category) return null;

    return (
        <div
            data-testid="destination-pill-wrap"
            className={`relative z-30 tg-no-select ${className}`}
            style={{ display: "inline-flex" }}
        >
            <motion.button
                data-testid={
                    open ? "destination-pill-expanded" : "destination-pill-collapsed"
                }
                onClick={() => {
                    haptics.tap();
                    togglePill();
                }}
                layout
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                className={
                    open
                        ? "flex max-w-[78vw] items-center gap-3 rounded-full px-4 py-2 text-left tg-glass-strong"
                        : "flex items-center gap-2 rounded-full px-3 py-1.5 tg-glass"
                }
            >
                <motion.span
                    layout="position"
                    className={
                        open
                            ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                            : "flex h-5 w-5 items-center justify-center rounded-full"
                    }
                    style={{
                        background: open ? category.accentSoft : "transparent",
                    }}
                >
                    <div style={{ width: open ? 14 : 12, height: open ? 14 : 12, display: "flex", alignItems: "center", justifyContent: "center", filter: `drop-shadow(0 0 2px ${category.glow || category.accent}40)` }}>
                        {category.svg}
                    </div>
                </motion.span>

                {open ? (
                    <motion.span
                        key="open-text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex min-w-0 flex-col items-start"
                    >
                        <span
                            data-testid="destination-name"
                            className="block max-w-[60vw] truncate text-[13px] font-bold text-white"
                        >
                            {destination?.name || "Resolving…"}
                        </span>
                        <span className="block max-w-[60vw] truncate text-[11px] text-white/45">
                            {destination?.address ||
                                (distance != null
                                    ? formatDistance(distance, units) + " away"
                                    : "")}
                        </span>
                    </motion.span>
                ) : (
                    <motion.span
                        key="closed-text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55"
                    >
                        {category.label}
                    </motion.span>
                )}

                {open && (
                    <ChevronDown
                        size={14}
                        className="ml-1 shrink-0 text-white/30"
                        strokeWidth={1.8}
                    />
                )}
            </motion.button>
        </div>
    );
}
