import React from "react";
import { motion } from "framer-motion";
import { MODES, getCategoryByKey } from "@/lib/categories";
import { haptics } from "@/lib/haptics";
import { useApp } from "@/lib/AppState";

const cardSpring = { type: "spring", stiffness: 380, damping: 28, mass: 0.7 };

function CategoryCard({ category, onSelect, theme }) {
    if (!category) return null;
    const accentColor = category.accent;
    const glowColor = category.glow || category.accent;

    const borderStyle = theme === "light"
        ? `1px solid ${accentColor}A6`
        : `1px solid ${accentColor}59`;

    const boxShadowStyle = theme === "light"
        ? `0 4px 8px rgba(0, 0, 0, 0.01), 0 8px 16px rgba(0, 0, 0, 0.02), 0 16px 28px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.7), 0 0 6px ${glowColor}08`
        : `0 4px 10px rgba(0, 0, 0, 0.25), 0 12px 24px rgba(0, 0, 0, 0.35), 0 0 8px ${glowColor}22, inset 0 0 4px ${glowColor}15, inset 0 1px 0 rgba(255, 255, 255, 0.03)`;

    const shadowFilter = theme === "light"
        ? `drop-shadow(0 1px 2px rgba(0, 0, 0, 0.14))`
        : `drop-shadow(0 0 6px ${glowColor}66)`;

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
            className="group relative flex h-[125px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl tg-glass tg-no-select"
            style={{
                border: borderStyle,
                boxShadow: boxShadowStyle
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
                <div style={{
                    width: 38,
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    filter: shadowFilter
                }}>
                    {category.Icon && <category.Icon size={28} strokeWidth={2.2} style={{ color: accentColor }} />}
                </div>
                <div className="text-[15px] font-extrabold tracking-tight text-white">
                    {category.label}
                </div>
            </div>
        </motion.button>
    );
}

const MODE_HEADINGS = {
    explore: "Where would you like to go?",
    date: "Planning something memorable?",
    escape: "Need a break from it all?",
    social: "Where's the crew heading?",
    essentials: "What do you need to get done today?",
};

export default function HomeScreen({ onSelectCategory }) {
    const { appMode, theme, changeAppMode } = useApp();
    const config = MODES[appMode] || MODES.explore;
    const tiles = config.keys.map((k) => getCategoryByKey(k)).filter(Boolean);

    const handleToggleMode = () => {
        haptics.success();
        const modeKeys = Object.keys(MODES);
        const currentIndex = modeKeys.indexOf(appMode);
        const nextIndex = (currentIndex + 1) % modeKeys.length;
        const nextMode = modeKeys[nextIndex];
        changeAppMode(nextMode);
    };

    return (
        <div
            data-testid="home-screen"
            className="relative flex h-[100dvh] w-full flex-col overflow-hidden px-5 pt-safe pb-[90px] justify-center tg-no-select"
        >
            <div className="tg-ambient" />

            <div className="relative z-10 w-full max-w-[400px] mx-auto translate-y-2 flex flex-col">
                <motion.header
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                    className="relative pt-5 pb-5 w-full"
                >
                    <motion.button
                        data-testid="mode-cycle-tile"
                        onClick={handleToggleMode}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full h-[30px] px-[16px] text-[10.5px] font-bold uppercase tracking-[0.2em] border transition-all duration-300 tg-no-select"
                        style={{
                            background: theme === "light"
                                ? "rgba(var(--mode-accent-rgb), 0.06)"
                                : "rgba(var(--mode-accent-rgb), 0.08)",
                            borderColor: theme === "light"
                                ? "rgba(var(--mode-accent-rgb), 0.25)"
                                : "rgba(var(--mode-accent-rgb), 0.3)",
                            color: "var(--mode-accent)",
                            boxShadow: theme === "light"
                                ? "0 2px 8px rgba(var(--mode-accent-rgb), 0.05)"
                                : "0 4px 12px rgba(var(--mode-accent-rgb), 0.15)",
                        }}
                    >
                        {(() => {
                            const currentModeObj = MODES[appMode] || MODES.explore;
                            const ModeIcon = currentModeObj.icon;
                            return (
                                <>
                                    {ModeIcon && <ModeIcon size={12} strokeWidth={2.5} className="opacity-85" />}
                                    <span>{currentModeObj.label} Mode</span>
                                </>
                            );
                        })()}
                    </motion.button>
                    <motion.h1
                        key={appMode}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        data-testid="home-heading"
                        className="mt-2 text-[36px] font-black leading-[1.05] tracking-tight text-white"
                    >
                        {MODE_HEADINGS[appMode] || "Where do you want to go?"}
                    </motion.h1>
                </motion.header>

                <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 0.7,
                        delay: 0.08,
                        ease: [0.32, 0.72, 0, 1],
                    }}
                    className="relative flex min-h-0 flex-col pb-8 w-full mt-2"
                >
                    <div className="grid grid-cols-2 gap-3.5">
                        {tiles.map((cat) => (
                            <CategoryCard
                                key={cat.key}
                                category={cat}
                                onSelect={onSelectCategory}
                                theme={theme}
                            />
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}