import React from "react";
import { motion } from "framer-motion";
import { MODES, getCategoryByKey } from "@/lib/categories";
import { haptics } from "@/lib/haptics";
import { useApp } from "@/lib/AppState";

const cardSpring = { type: "spring", stiffness: 380, damping: 28, mass: 0.7 };

function HeroCard({ category, onSelect, theme }) {
    if (!category) return null;
    const accentColor = category.accent;
    const glowColor = category.glow || category.accent;
    return (
        <motion.button
            data-testid={`category-${category.key}`}
            onClick={() => {
                haptics.select();
                onSelect(category);
            }}
            whileHover={{ scale: 1.015, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={cardSpring}
            className="group relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[26px] tg-glass tg-no-select"
            style={{
                border: theme === "light"
                    ? "1px solid rgba(0, 0, 0, 0.06)"
                    : `1px solid ${accentColor}33`,
                boxShadow: theme === "light"
                    ? `0 4px 10px rgba(0, 0, 0, 0.01), 0 10px 24px rgba(0, 0, 0, 0.03), 0 20px 38px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 0 8px ${glowColor}0D`
                    : `0 4px 12px rgba(0, 0, 0, 0.3), 0 16px 40px rgba(0, 0, 0, 0.45), 0 0 10px ${glowColor}33, inset 0 0 6px ${glowColor}20, inset 0 1px 0 rgba(255, 255, 255, 0.04)`
            }}
        >
            {/* Soft animated ambient background gradient */}
            <motion.div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${accentColor}1A 0%, transparent 70%)`
                }}
                animate={{
                    opacity: [0.35, 0.65, 0.35],
                    scale: [0.95, 1.08, 0.95]
                }}
                transition={{
                    repeat: Infinity,
                    duration: 5,
                    ease: "easeInOut"
                }}
            />

            <div className="relative z-10 flex flex-col items-center justify-center gap-2.5">
                <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", filter: theme === "light" ? `drop-shadow(0 1.5px 2.5px rgba(0, 0, 0, 0.16))` : `drop-shadow(0 0 8px ${glowColor}66)` }}>
                    {category.Icon && <category.Icon size={32} strokeWidth={2.2} style={{ color: accentColor }} />}
                </div>
                <div className="text-[20px] font-black tracking-tight text-white">
                    {category.key === "grass" ? "Touch Grass" : category.label}
                </div>
            </div>
        </motion.button>
    );
}

function StandardCard({ category, onSelect, theme }) {
    if (!category) return null;
    const accentColor = category.accent;
    const glowColor = category.glow || category.accent;
    return (
        <motion.button
            data-testid={`category-${category.key}`}
            onClick={() => {
                haptics.select();
                onSelect(category);
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={cardSpring}
            className="group relative flex h-[115px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl tg-glass tg-no-select"
            style={{
                border: theme === "light"
                    ? "1px solid rgba(0, 0, 0, 0.05)"
                    : `1px solid rgba(255, 255, 255, 0.04)`,
                boxShadow: theme === "light"
                    ? `0 4px 8px rgba(0, 0, 0, 0.01), 0 8px 16px rgba(0, 0, 0, 0.02), 0 16px 28px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.7), 0 0 6px ${glowColor}08`
                    : `0 4px 10px rgba(0, 0, 0, 0.25), 0 12px 24px rgba(0, 0, 0, 0.35), 0 0 8px ${glowColor}22, inset 0 0 4px ${glowColor}15, inset 0 1px 0 rgba(255, 255, 255, 0.03)`
            }}
        >
            {/* Soft animated ambient background gradient */}
            <motion.div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at 50% 50%, ${accentColor}1A 0%, transparent 70%)`
                }}
                animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [0.92, 1.06, 0.92]
                }}
                transition={{
                    repeat: Infinity,
                    duration: 5.5,
                    ease: "easeInOut"
                }}
            />

            <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", filter: theme === "light" ? `drop-shadow(0 1px 2px rgba(0, 0, 0, 0.14))` : `drop-shadow(0 0 6px ${glowColor}66)` }}>
                    {category.Icon && <category.Icon size={24} strokeWidth={2.2} style={{ color: accentColor }} />}
                </div>
                <div className="text-[13px] font-extrabold tracking-tight text-white">
                    {category.label}
                </div>
            </div>
        </motion.button>
    );
}

export default function HomeScreen({ onSelectCategory }) {
    const { appMode, theme } = useApp();
    const config = MODES[appMode] || MODES.explore;
    const grass = getCategoryByKey(config.mainKey);
    const rest = config.gridKeys.map((k) => getCategoryByKey(k)).filter(Boolean);

    return (
        <div
            data-testid="home-screen"
            className="relative flex h-[100dvh] w-full flex-col overflow-hidden px-5 pt-safe pb-[110px] justify-center tg-no-select"
        >
            <div className="tg-ambient" />

            <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                className="relative z-10 pt-5 pb-5 w-full max-w-[400px] mx-auto"
            >
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
                    Touch Grass
                </div>
                <h1
                    data-testid="home-heading"
                    className="mt-2 text-[36px] font-black leading-[1.05] tracking-tight text-white"
                >
                    Where would you<br />like to go?
                </h1>
            </motion.header>

            <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.7,
                    delay: 0.08,
                    ease: [0.32, 0.72, 0, 1],
                }}
                className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 pb-8 max-w-[400px] mx-auto w-full mt-2"
            >
                <div className="w-full h-[160px] shrink-0">
                    <HeroCard category={grass} onSelect={onSelectCategory} theme={theme} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-0">
                    {rest.map((cat) => (
                        <StandardCard
                            key={cat.key}
                            category={cat}
                            onSelect={onSelectCategory}
                            theme={theme}
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
