import React from "react";
import { motion } from "framer-motion";
import { MODES, getCategoryByKey } from "@/lib/categories";
import { haptics } from "@/lib/haptics";
import { useApp } from "@/lib/AppState";

const cardSpring = { type: "spring", stiffness: 380, damping: 28, mass: 0.7 };

function CategoryCard({ category, onSelect, theme, variant = "standard" }) {
    if (!category) return null;
    const isHero = variant === "hero";
    const accentColor = category.accent;
    const glowColor = category.glow || category.accent;

    const hoverScale = isHero ? 1.015 : 1.02;
    const tapScale = isHero ? 0.98 : 0.97;
    const heightClass = isHero ? "h-full" : "h-[115px]";
    const roundedClass = isHero ? "rounded-[26px]" : "rounded-2xl";
    
    const borderOpacityLight = isHero ? "B3" : "A6";
    const borderOpacityDark = isHero ? "66" : "59";

    const borderStyle = theme === "light"
        ? `1px solid ${accentColor}${borderOpacityLight}`
        : `1px solid ${accentColor}${borderOpacityDark}`;

    const boxShadowStyle = theme === "light"
        ? (isHero
            ? `0 4px 10px rgba(0, 0, 0, 0.01), 0 10px 24px rgba(0, 0, 0, 0.03), 0 20px 38px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 0 8px ${glowColor}0D`
            : `0 4px 8px rgba(0, 0, 0, 0.01), 0 8px 16px rgba(0, 0, 0, 0.02), 0 16px 28px rgba(0, 0, 0, 0.03), inset 0 1px 1px rgba(255, 255, 255, 0.7), 0 0 6px ${glowColor}08`)
        : (isHero
            ? `0 4px 12px rgba(0, 0, 0, 0.3), 0 16px 40px rgba(0, 0, 0, 0.45), 0 0 10px ${glowColor}33, inset 0 0 6px ${glowColor}20, inset 0 1px 0 rgba(255, 255, 255, 0.04)`
            : `0 4px 10px rgba(0, 0, 0, 0.25), 0 12px 24px rgba(0, 0, 0, 0.35), 0 0 8px ${glowColor}22, inset 0 0 4px ${glowColor}15, inset 0 1px 0 rgba(255, 255, 255, 0.03)`);

    const gradientOpacity = isHero ? [0.35, 0.65, 0.35] : [0.3, 0.6, 0.3];
    const gradientScale = isHero ? [0.95, 1.08, 0.95] : [0.92, 1.06, 0.92];
    const durationTime = isHero ? 5 : 5.5;

    const iconSize = isHero ? 32 : 24;
    const iconContainerSize = isHero ? 44 : 32;
    const shadowFilter = theme === "light"
        ? (isHero ? `drop-shadow(0 1.5px 2.5px rgba(0, 0, 0, 0.16))` : `drop-shadow(0 1px 2px rgba(0, 0, 0, 0.14))`)
        : (isHero ? `drop-shadow(0 0 8px ${glowColor}66)` : `drop-shadow(0 0 6px ${glowColor}66)`);
        
    const textClass = isHero ? "text-[20px] font-black" : "text-[13px] font-extrabold";
    const gapClass = isHero ? "gap-2.5" : "gap-2";

    return (
        <motion.button
            data-testid={`category-${category.key}`}
            onClick={() => {
                haptics.select();
                onSelect(category);
            }}
            whileHover={{ scale: hoverScale, y: -2 }}
            whileTap={{ scale: tapScale }}
            transition={cardSpring}
            className={`group relative flex ${heightClass} w-full flex-col items-center justify-center overflow-hidden ${roundedClass} tg-glass tg-no-select`}
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
                    opacity: gradientOpacity,
                    scale: gradientScale
                }}
                transition={{
                    repeat: Infinity,
                    duration: durationTime,
                    ease: "easeInOut"
                }}
            />

            <div className={`relative z-10 flex flex-col items-center justify-center ${gapClass}`}>
                <div style={{
                    width: iconContainerSize,
                    height: iconContainerSize,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    filter: shadowFilter
                }}>
                    {category.Icon && <category.Icon size={iconSize} strokeWidth={2.2} style={{ color: accentColor }} />}
                </div>
                <div className={`${textClass} tracking-tight text-white`}>
                    {category.key === "grass" && isHero ? "Touch Grass" : category.label}
                </div>
            </div>
        </motion.button>
    );
}

export default function HomeScreen({ onSelectCategory }) {
    const { appMode, theme, changeAppMode } = useApp();
    const config = MODES[appMode] || MODES.explore;
    const grass = getCategoryByKey(config.mainKey);
    const rest = config.gridKeys.map((k) => getCategoryByKey(k)).filter(Boolean);

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
            className="relative flex h-[100dvh] w-full flex-col overflow-hidden px-5 pt-safe pb-[110px] justify-center tg-no-select"
        >
            <div className="tg-ambient" />

            <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                className="relative z-10 pt-5 pb-5 w-full max-w-[400px] mx-auto"
            >
                <motion.button
                    data-testid="mode-cycle-tile"
                    onClick={handleToggleMode}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] border transition-all duration-300 tg-no-select"
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
                                {ModeIcon && <ModeIcon size={10} strokeWidth={2.5} className="opacity-75" />}
                                <span>{currentModeObj.label} Mode</span>
                            </>
                        );
                    })()}
                </motion.button>
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
                    <CategoryCard category={grass} onSelect={onSelectCategory} theme={theme} variant="hero" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-0">
                    {rest.map((cat) => (
                        <CategoryCard
                            key={cat.key}
                            category={cat}
                            onSelect={onSelectCategory}
                            theme={theme}
                            variant="standard"
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
