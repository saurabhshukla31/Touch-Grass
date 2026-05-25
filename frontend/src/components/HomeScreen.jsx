import React from "react";
import { motion } from "framer-motion";
import { CATEGORIES } from "@/lib/categories";
import { haptics } from "@/lib/haptics";

const cardSpring = { type: "spring", stiffness: 380, damping: 28, mass: 0.7 };

function HeroCard({ category, onSelect }) {
    if (!category) return null;
    return (
        <motion.button
            data-testid={`category-${category.key}`}
            onClick={() => {
                haptics.select();
                onSelect(category);
            }}
            whileTap={{ scale: 0.97 }}
            transition={cardSpring}
            className="group relative flex h-full w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[26px] tg-glass tg-no-select"
            style={{
                border: `1px solid ${category.accent}4C`,
                boxShadow: `0 0 15px ${category.glow || category.accent}66, inset 0 0 10px ${category.glow || category.accent}4D`
            }}
        >
            <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", filter: `drop-shadow(0 0 8px ${category.glow || category.accent}66)` }}>
                {category.svg}
            </div>
            <div className="text-[20px] font-black tracking-tight text-white">
                {category.label}
            </div>
        </motion.button>
    );
}

function StandardCard({ category, onSelect }) {
    if (!category) return null;
    const isRandom = category.key === "random";
    return (
        <motion.button
            data-testid={`category-${category.key}`}
            onClick={() => {
                haptics.select();
                onSelect(category);
            }}
            whileTap={{ scale: 0.96 }}
            transition={cardSpring}
            className="group relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl tg-glass tg-no-select !border-[1px] !border-slate-200/35 !shadow-[0_0_12px_rgba(203,213,225,0.4),inset_0_0_8px_rgba(255,255,255,0.3)]"
        >
            <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", filter: `drop-shadow(0 0 4px ${category.glow || category.accent}4d)` }}>
                {category.svg}
            </div>
            <div className="text-[12.5px] font-semibold tracking-tight text-white/90">
                {category.label}
            </div>
        </motion.button>
    );
}

export default function HomeScreen({ onSelectCategory }) {
    const grass = CATEGORIES.find((c) => c.key === "grass");
    const rest = CATEGORIES.filter((c) => c.key !== "grass");

    return (
        <div
            data-testid="home-screen"
            className="relative flex h-[100dvh] w-full flex-col px-5 pt-safe pb-safe justify-center tg-no-select"
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
                animate={{ opacity: 1, y: 20 }}
                transition={{
                    duration: 0.7,
                    delay: 0.08,
                    ease: [0.32, 0.72, 0, 1],
                }}
                className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 pb-8 max-w-[400px] mx-auto w-full"
            >
                <div className="flex-[1.5] w-full min-h-[140px]">
                    <HeroCard category={grass} onSelect={onSelectCategory} />
                </div>
                <div className="grid flex-[3] min-h-0 grid-cols-3 grid-rows-3 gap-3">
                    {rest.map((cat) => (
                        <StandardCard
                            key={cat.key}
                            category={cat}
                            onSelect={onSelectCategory}
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
