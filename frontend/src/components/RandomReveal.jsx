import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { haptics } from "@/lib/haptics";

export default function RandomReveal({ category }) {
    useEffect(() => {
        if (category) haptics.soft();
    }, [category]);
    if (!category) return null;

    return (
        <motion.div
            data-testid="random-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
            style={{
                background: "rgba(8,8,10,0.85)",
                backdropFilter: "blur(18px)",
            }}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                className="flex flex-col items-center"
            >
                <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/40">
                    The dice landed on
                </div>
                <div className="mt-6 flex flex-col items-center">
                    <div
                        className="flex h-24 w-24 items-center justify-center rounded-3xl"
                        style={{
                            background: category.accentSoft,
                            boxShadow: `0 0 60px -8px ${category.glow || category.accent}55, inset 0 0 0 1px ${category.glow || category.accent}30`,
                        }}
                    >
                        <div style={{ width: 48, height: 48, filter: `drop-shadow(0 0 12px ${category.glow || category.accent}88)` }}>
                            {category.svg}
                        </div>
                    </div>
                    <div className="mt-6 text-3xl font-black tracking-tight text-white">
                        {category.label}
                    </div>
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 text-xs text-white/45"
                >
                    Finding the closest one…
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
