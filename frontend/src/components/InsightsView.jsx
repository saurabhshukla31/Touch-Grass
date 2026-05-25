import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listSessions, listPhotos, clearAllData } from "@/lib/db";
import { formatDistance } from "@/lib/geo";
import { useApp } from "@/lib/AppState";
import { haptics } from "@/lib/haptics";
import { CATEGORIES } from "@/lib/categories";

function Section({ title, children }) {
    return (
        <section className="mt-7">
            <div className="mb-3 flex items-baseline justify-between px-1">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
                    {title}
                </h2>
            </div>
            {children}
        </section>
    );
}

export default function InsightsView() {
    const { units } = useApp();
    const [sessions, setSessions] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [confirming, setConfirming] = useState(false);
    const [wiping, setWiping] = useState(false);

    const load = async () => {
        try {
            const [s, p] = await Promise.all([listSessions(), listPhotos()]);
            setSessions(s);
            setPhotos(p);
        } catch {
            /* ignore */
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleWipe = async () => {
        setWiping(true);
        try {
            await clearAllData();
            haptics.success();
            toast.success("All data cleared.");
            setSessions([]);
            setPhotos([]);
        } finally {
            setWiping(false);
            setConfirming(false);
        }
    };

    const totalDistance = useMemo(
        () => sessions.reduce((a, x) => a + (x.distance || 0), 0),
        [sessions],
    );

    const heat = useMemo(() => {
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            days.push({ date: d, count: 0 });
        }
        sessions.forEach((s) => {
            if (!s.startedAt) return;
            const d = new Date(s.startedAt);
            d.setHours(0, 0, 0, 0);
            const day = days.find((x) => x.date.getTime() === d.getTime());
            if (day) day.count += 1;
        });
        return days;
    }, [sessions]);
    const maxHeat = Math.max(1, ...heat.map((d) => d.count));

    return (
        <div
            data-testid="insights-view"
            className="relative min-h-[100dvh] w-full overflow-y-auto px-5 pt-safe pb-40 tg-no-select"
        >
            <div className="tg-ambient" />
            <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 pt-6"
            >
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
                    Stats
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                    Where you've been.
                </h1>
            </motion.header>

            <div className="relative z-10">
                <Section title="Distance">
                    <div className="rounded-3xl p-6 tg-glass">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                            Total
                        </div>
                        <div
                            data-testid="insights-total-distance"
                            className="mt-1 text-4xl font-black tracking-tight text-white"
                        >
                            {formatDistance(totalDistance, units)}
                        </div>
                        <div className="mt-1 text-xs text-white/45">
                            across{" "}
                            <span data-testid="insights-session-count">
                                {sessions.length}
                            </span>{" "}
                            {sessions.length === 1 ? "session" : "sessions"}
                        </div>
                    </div>
                </Section>

                <Section title="Activity · 30 days">
                    <div className="rounded-3xl p-5 tg-glass">
                        <div className="grid grid-cols-10 gap-1.5">
                            {heat.map((d, i) => {
                                const intensity = d.count / maxHeat;
                                return (
                                    <div
                                        key={i}
                                        className="aspect-square rounded-md"
                                        style={{
                                            background:
                                                d.count > 0
                                                    ? `rgba(16,185,129,${0.18 + intensity * 0.55})`
                                                    : "rgba(255,255,255,0.04)",
                                            boxShadow:
                                                d.count > 0
                                                    ? "inset 0 0 0 1px rgba(16,185,129,0.18)"
                                                    : "inset 0 0 0 1px rgba(255,255,255,0.04)",
                                        }}
                                        title={d.date.toDateString()}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </Section>

                <Section title="Sessions">
                    {sessions.length === 0 ? (
                        <div
                            data-testid="insights-empty"
                            className="rounded-3xl p-6 text-center tg-glass"
                        >
                            <div className="text-sm font-semibold text-white">
                                No sessions yet.
                            </div>
                            <div className="mt-1 text-xs text-white/45">
                                Pick a destination from the home screen to begin.
                            </div>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {sessions.map((s) => {
                                const category = CATEGORIES.find(c => c.iconKey === s.iconKey) || CATEGORIES.find(c => c.key === "random");
                                return (
                                    <li
                                        key={s.id}
                                        className="flex items-center gap-3 rounded-2xl px-4 py-3 tg-glass"
                                    >
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
                                            <div style={{ width: 20, height: 20, filter: `drop-shadow(0 0 4px ${category.glow || category.accent}4d)` }}>
                                                {category.svg}
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-semibold text-white">
                                                {s.destinationName}
                                            </div>
                                            <div className="truncate text-[11px] text-white/45">
                                                {new Date(s.startedAt).toLocaleString(
                                                    undefined,
                                                    {
                                                        month: "short",
                                                        day: "numeric",
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    },
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-semibold text-white/70">
                                                {formatDistance(s.distance, units)}
                                            </div>
                                            <div className="text-[10px] uppercase tracking-widest text-white/30">
                                                {s.categoryLabel}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Section>

                <Section title="Grass Gallery">
                    {photos.length === 0 ? (
                        <div className="rounded-3xl p-6 text-center tg-glass">
                            <div className="text-sm font-semibold text-white">
                                Nothing to show yet.
                            </div>
                            <div className="mt-1 text-xs text-white/45">
                                Verified grass moments appear here.
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {photos.map((p) => (
                                <div
                                    key={p.id}
                                    className="relative aspect-square overflow-hidden rounded-2xl tg-glass"
                                >
                                    <img
                                        src={p.dataUrl}
                                        alt=""
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                <Section title="Storage">
                    <div className="rounded-3xl p-5 tg-rose-glow">
                        <div className="flex flex-col gap-4">
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                    </span>
                                    On-Device Storage
                                </div>
                                <div className="mt-2 text-[11px] leading-relaxed text-white/50">
                                    Sessions, photos, and preferences live locally in this browser.
                                    Clearing removes them permanently from this device.
                                </div>
                            </div>
                            <motion.button
                                data-testid="stats-clear"
                                onClick={() => {
                                    haptics.warn();
                                    setConfirming(true);
                                }}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 text-xs font-bold text-rose-300 transition-all hover:bg-rose-500/15"
                            >
                                <Trash2 size={13} strokeWidth={2} />
                                Clear Data
                            </motion.button>
                        </div>
                    </div>
                </Section>
            </div>

            <AnimatePresence>
                {confirming && (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-end justify-center px-5"
                        style={{
                            background: "rgba(8,8,10,0.55)",
                            backdropFilter: "blur(14px)",
                        }}
                        onClick={() => setConfirming(false)}
                    >
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 30, opacity: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 320,
                                damping: 28,
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mb-32 w-full max-w-sm rounded-3xl p-6 tg-glass-strong"
                            data-testid="clear-confirm"
                        >
                            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-300/80">
                                Heads up
                            </div>
                            <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                                Erase everything?
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-white/55">
                                All sessions, verified-grass photos and saved
                                preferences will be removed from this browser.
                                This cannot be undone.
                            </p>
                            <div className="mt-5 flex gap-2">
                                <button
                                    data-testid="clear-cancel"
                                    onClick={() => {
                                        haptics.tap();
                                        setConfirming(false);
                                    }}
                                    className="flex-1 rounded-full bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    data-testid="clear-confirm-btn"
                                    onClick={handleWipe}
                                    disabled={wiping}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-500/85 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                                >
                                    <Trash2 size={14} strokeWidth={2.2} />
                                    {wiping ? "Clearing…" : "Erase"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
