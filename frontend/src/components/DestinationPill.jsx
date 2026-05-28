import React from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import { haptics } from "@/lib/haptics";
import { useApp } from "@/lib/AppState";

export default function DestinationPill({
    category,
    destination,
    distance,
    units = "metric",
    anchor = "top",
    className = "",
    alwaysShowPlaceName = false,
}) {
    const { pillOpen, togglePill } = useApp();
    const isOpen = alwaysShowPlaceName ? true : pillOpen;
    if (!category) return null;

    return (
        <div
            data-testid="destination-pill-wrap"
            className={`relative z-30 tg-no-select touch-manipulation ${className}`}
            style={{ display: "inline-flex" }}
        >
            <motion.button
                data-testid={
                    isOpen ? "destination-pill-expanded" : "destination-pill-collapsed"
                }
                onClick={() => {
                    if (alwaysShowPlaceName) return;
                    haptics.tap();
                    togglePill();
                }}
                layout
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                className={
                    isOpen
                        ? "flex max-w-[78vw] items-center rounded-full px-4 py-2 text-left tg-glass-strong w-fit mx-auto"
                        : "flex items-center justify-center rounded-full px-3 py-1 tg-glass w-fit mx-auto"
                }
            >
                {isOpen ? (
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
                        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55 text-center"
                    >
                        {category.label}
                    </motion.span>
                )}

                {isOpen && !alwaysShowPlaceName && (
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
