import React from "react";
import { motion } from "framer-motion";
import { Home, Compass, Map as MapIcon, ChartNoAxesCombined, Settings } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { useApp } from "@/lib/AppState";

const TABS = [
    { key: "home", label: "Home", Icon: Home },
    { key: "compass", label: "Compass", Icon: Compass },
    { key: "map", label: "Map", Icon: MapIcon },
    { key: "insights", label: "Stats", Icon: ChartNoAxesCombined },
    { key: "settings", label: "Settings", Icon: Settings },
];

export default function TabBar({ currentTab, onChange }) {
    const { theme } = useApp();

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
                    background: theme === "light"
                        ? "linear-gradient(to top, rgba(209,209,214,0.95) 0%, rgba(209,209,214,0.55) 50%, rgba(209,209,214,0) 100%)"
                        : "linear-gradient(to top, rgba(8,8,10,0.9) 0%, rgba(8,8,10,0.55) 50%, rgba(8,8,10,0) 100%)",
                }}
            />
            <motion.nav
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 26 }}
                className="pointer-events-auto relative flex w-full items-center justify-between gap-1 rounded-[26px] p-1.5 tg-no-select"
                style={{
                    background: theme === "light"
                        ? "rgba(205, 205, 212, 0.7)"
                        : "rgba(12, 12, 16, 0.72)",
                    border: theme === "light"
                        ? "1px solid rgba(0, 0, 0, 0.15)"
                        : "0.5px solid rgba(255, 255, 255, 0.12)",
                    backdropFilter: theme === "light"
                        ? "blur(36px) saturate(180%)"
                        : "blur(40px) saturate(210%)",
                    WebkitBackdropFilter: theme === "light"
                        ? "blur(36px) saturate(180%)"
                        : "blur(40px) saturate(210%)",
                    boxShadow: theme === "light"
                        ? "inset 0 1px 0 rgba(255,255,255,0.7), 0 12px 32px rgba(0,0,0,0.04)"
                        : "inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 60px rgba(0,0,0,0.85), 0 2px 0 rgba(255,255,255,0.03)",
                }}
            >
                {TABS.map(({ key, label, Icon }) => {
                    const isActive = currentTab === key;
                    return (
                        <button
                            key={key}
                            data-testid={`tab-${key}`}
                            onClick={() => {
                                if (!isActive) haptics.tap();
                                onChange(key);
                            }}
                            aria-label={label}
                            className={`relative flex h-12 items-center justify-center overflow-hidden whitespace-nowrap rounded-[20px] text-[11px] font-semibold ${isActive
                                    ? "flex-[2] gap-1.5 px-3 text-white"
                                    : "flex-1 text-white/55"
                                }`}
                            style={{
                                transition: "flex 0.22s cubic-bezier(0.16, 1, 0.3, 1), color 0.15s, background-color 0.15s",
                            }}
                        >
                            {isActive && (
                                <motion.span
                                    layoutId="tab-pill"
                                    className="absolute inset-0 rounded-[20px]"
                                    transition={{
                                        type: "spring",
                                        stiffness: 550,
                                        damping: 38,
                                    }}
                                    style={{
                                        background: theme === "light"
                                            ? "rgba(215, 215, 222, 0.7)"
                                            : "rgba(255, 255, 255, 0.08)",
                                        border: theme === "light"
                                            ? "1px solid rgba(var(--mode-accent-rgb), 0.22)"
                                            : "0.5px solid rgba(var(--mode-accent-rgb), 0.35)",
                                        boxShadow: theme === "light"
                                            ? "0 4px 12px rgba(var(--mode-accent-rgb), 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
                                            : "inset 0 1px 0 rgba(255, 255, 255, 0.16), inset 0 -1px 0 rgba(0, 0, 0, 0.2), 0 4px 16px rgba(var(--mode-accent-rgb), 0.28)",
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
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="relative tracking-tight font-bold text-[12.5px] whitespace-nowrap"
                                >
                                    {label}
                                </motion.span>
                            )}
                        </button>
                    );
                })}
            </motion.nav>
        </div>
    );
}
