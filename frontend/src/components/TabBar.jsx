import React from "react";
import { motion } from "framer-motion";
import { Home, Compass, Map as MapIcon, ChartNoAxesCombined, Settings } from "lucide-react";
import { haptics } from "@/lib/haptics";

const TABS = [
    { key: "home", label: "Home", Icon: Home },
    { key: "compass", label: "Compass", Icon: Compass },
    { key: "map", label: "Map", Icon: MapIcon },
    { key: "insights", label: "Stats", Icon: ChartNoAxesCombined },
    { key: "settings", label: "Settings", Icon: Settings },
];

export default function TabBar({ currentTab, onChange }) {
    return (
        <div
            data-testid="tab-bar"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3"
            style={{
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
            }}
        >
            {/* Soft fade so the bar lifts off content cleanly. */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
                style={{
                    background:
                        "linear-gradient(to top, rgba(8,8,10,0.9) 0%, rgba(8,8,10,0.55) 50%, rgba(8,8,10,0) 100%)",
                }}
            />
            <motion.nav
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                className="pointer-events-auto relative flex w-full items-center justify-between gap-1 rounded-[26px] p-1.5 tg-glass-strong tg-no-select"
                style={{
                    boxShadow:
                        "inset 0 1px 1px rgba(255,255,255,0.10), 0 24px 60px rgba(0,0,0,0.85), 0 2px 0 rgba(255,255,255,0.04)",
                }}
            >
                {TABS.map(({ key, label, Icon }) => {
                    const isActive = currentTab === key;
                    return (
                        <motion.button
                            key={key}
                            data-testid={`tab-${key}`}
                            onClick={() => {
                                if (!isActive) haptics.tap();
                                onChange(key);
                            }}
                            aria-label={label}
                            layout
                            transition={{
                                type: "spring",
                                stiffness: 380,
                                damping: 32,
                            }}
                            className={`relative flex h-12 items-center justify-center overflow-hidden whitespace-nowrap rounded-[20px] text-[11px] font-semibold ${
                                isActive
                                    ? "flex-[2] gap-1.5 px-3 text-white"
                                    : "flex-1 text-white/55"
                            }`}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="tab-pill"
                                    className="absolute inset-0 rounded-[20px] tg-tab-pill"
                                    transition={{
                                        type: "spring",
                                        stiffness: 380,
                                        damping: 32,
                                    }}
                                    style={{
                                        background:
                                            "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)",
                                        boxShadow:
                                            "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.25), 0 6px 16px rgba(0,0,0,0.4)",
                                    }}
                                />
                            )}
                            <Icon
                                size={18}
                                strokeWidth={isActive ? 2.2 : 1.8}
                                className="relative shrink-0"
                            />
                            {isActive && (
                                <motion.span
                                    initial={{ opacity: 0, x: -4 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="relative tracking-tight font-bold text-[12.5px] whitespace-nowrap"
                                >
                                    {label}
                                </motion.span>
                            )}
                        </motion.button>
                    );
                })}
            </motion.nav>
        </div>
    );
}
