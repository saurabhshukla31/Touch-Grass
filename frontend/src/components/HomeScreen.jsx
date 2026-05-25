import React from "react";
import { motion } from "framer-motion";
import {
    Coffee,
    Fuel,
    Hospital as HospitalIcon,
    Utensils,
    Pill,
    Landmark,
    Dumbbell,
    Wine,
    Shuffle,
} from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { GrassLeaf } from "@/components/icons/GrassLeaf";
import { haptics } from "@/lib/haptics";

const ICONS = {
    grass: GrassLeaf,
    coffee: Coffee,
    fuel: Fuel,
    hospital: HospitalIcon,
    utensils: Utensils,
    pill: Pill,
    landmark: Landmark,
    dumbbell: Dumbbell,
    wine: Wine,
    shuffle: Shuffle,
};

const cardSpring = { type: "spring", stiffness: 380, damping: 28, mass: 0.7 };

function HeroCard({ category, onSelect }) {
    const Icon = ICONS[category.iconKey] || Shuffle;
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
        >
            <Icon size={30} strokeWidth={1.5} className="text-white/85" />
            <div className="text-[20px] font-black tracking-tight text-white">
                Touch Grass
            </div>
        </motion.button>
    );
}

function StandardCard({ category, onSelect }) {
    const Icon = ICONS[category.iconKey] || Shuffle;
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
            className={`group relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl tg-glass tg-no-select ${
                isRandom ? "opacity-65" : ""
            }`}
        >
            <Icon
                size={20}
                strokeWidth={1.5}
                className="text-white/80"
            />
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
            className="relative flex h-[100dvh] w-full flex-col px-5 pt-safe pb-28 tg-no-select"
        >
            <div className="tg-ambient" />

            <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                className="relative z-10 pt-5 pb-5"
            >
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
                    Touch Grass
                </div>
                <h1
                    data-testid="home-heading"
                    className="mt-2 text-[30px] font-black leading-[1.05] tracking-tight text-white"
                >
                    Where would you<br />like to go?
                </h1>
            </motion.header>

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.7,
                    delay: 0.08,
                    ease: [0.32, 0.72, 0, 1],
                }}
                className="relative z-10 flex min-h-0 flex-1 flex-col gap-2.5"
            >
                <div className="flex-[1.35] min-h-[120px]">
                    <HeroCard category={grass} onSelect={onSelectCategory} />
                </div>
                <div className="grid flex-[3] min-h-0 grid-cols-3 grid-rows-3 gap-2.5">
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
