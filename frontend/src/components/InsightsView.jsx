import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Trash2,
    Flame,
    Clock,
    MapPin,
    TrendingUp,
    Footprints,
    Bike,
    Car,
    Trophy,
    Star,
    Route,
    X,
} from "lucide-react";
import { listSessions, listPhotos, clearAllData } from "@/lib/db";
import {
    formatDistance,
    formatDuration,
    formatSpeed,
    calculateStreaks,
    MODE_LABELS,
} from "@/lib/geo";
import { useApp } from "@/lib/AppState";
import { haptics } from "@/lib/haptics";
import { CATEGORIES } from "@/lib/categories";

// ── Tiny mode icon ────────────────────────────────────────────
function ModeIcon({ mode, size = 12, className = "" }) {
    const props = { size, strokeWidth: 2, className };
    if (mode === "bike") return <Bike {...props} />;
    if (mode === "car") return <Car {...props} />;
    return <Footprints {...props} />;
}

// ── Section wrapper ───────────────────────────────────────────
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

// ── Stat card (small, reusable) ───────────────────────────────
function StatCard({ label, value, icon: Icon, color = "emerald" }) {
    const colors = {
        emerald: "text-emerald-400",
        blue: "text-blue-400",
        amber: "text-amber-400",
        rose: "text-rose-400",
        violet: "text-violet-400",
        cyan: "text-cyan-400",
    };
    return (
        <div className="flex flex-col items-center gap-1.5 rounded-2xl p-4 tg-glass">
            <div className={`${colors[color] || colors.emerald}`}>
                <Icon size={18} strokeWidth={1.8} />
            </div>
            <div className="text-lg font-black tracking-tight text-white">
                {value}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">
                {label}
            </div>
        </div>
    );
}

function StreakCard({ value }) {
    return (
        <div 
            className="relative flex flex-col items-center justify-center text-center gap-1.5 rounded-[24px] p-4.5 overflow-hidden tg-glass"
            style={{
                border: "1px solid rgba(245, 158, 11, 0.25)",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, var(--card-bg) 100%)",
                boxShadow: "0 8px 32px rgba(245, 158, 11, 0.03)"
            }}
        >
            <div className="text-amber-500 relative flex items-center justify-center mb-0.5">
                <Flame size={18} strokeWidth={2.5} className="relative z-10 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                <motion.div
                    className="absolute inset-0 rounded-full bg-amber-500/20"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                    style={{ width: 18, height: 18 }}
                />
            </div>
            <div className="text-[19px] font-black tracking-tight text-white leading-none">
                {value}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
                Streak
            </div>
        </div>
    );
}

// ── Weekly bar chart (pure CSS) ───────────────────────────────
function WeeklyChart({ sessions, units, theme }) {
    const bars = useMemo(() => {
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            days.push({ date: d, distance: 0, sessions: 0 });
        }
        sessions.forEach((s) => {
            if (!s.startedAt) return;
            const d = new Date(s.startedAt);
            d.setHours(0, 0, 0, 0);
            const day = days.find((x) => x.date.getTime() === d.getTime());
            if (day) {
                day.distance += s.actualDistanceKm || (s.distance || 0) / 1000;
                day.sessions += 1;
            }
        });
        return days;
    }, [sessions]);

    const maxDist = Math.max(0.1, ...bars.map((b) => b.distance));
    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

    return (
        <div className="rounded-[24px] p-5 tg-glass">
            <div className="flex items-end justify-between gap-3 px-1" style={{ height: 110 }}>
                {bars.map((b, i) => {
                    const pct = Math.max(8, (b.distance / maxDist) * 100);
                    const hasData = b.distance > 0;
                    return (
                        <div key={i} className="flex flex-1 h-full flex-col justify-end items-center">
                            <div
                                className="w-full rounded-full transition-all duration-500"
                                style={{
                                    height: hasData ? `${pct}%` : "6px",
                                    background: hasData
                                        ? "linear-gradient(to top, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0.9) 100%)"
                                        : (theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)"),
                                    boxShadow: hasData
                                        ? "0 0 16px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
                                        : "none",
                                }}
                            />
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 flex justify-between gap-3 px-1">
                {bars.map((b, i) => (
                    <div
                        key={i}
                        className={`flex-1 text-center text-[10px] font-bold ${theme === "light" ? "text-black/30" : "text-white/30"}`}
                    >
                        {dayLabels[b.date.getDay()]}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Category donut chart (pure SVG) ───────────────────────────
function CategoryDonut({ sessions, theme }) {
    const categories = useMemo(() => {
        const map = {};
        sessions.forEach((s) => {
            const key = s.categoryKey || "unknown";
            if (!map[key]) map[key] = { key, count: 0, label: s.categoryLabel || key };
            map[key].count++;
        });
        return Object.values(map).sort((a, b) => b.count - a.count);
    }, [sessions]);

    if (!categories.length) return null;

    const total = categories.reduce((a, c) => a + c.count, 0);
    const colors = [
        "#10B981", "#60A5FA", "#F59E0B", "#EF4444",
        "#A78BFA", "#EC4899", "#14B8A6", "#F97316",
    ];

    let offset = 0;
    const radius = 35;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="rounded-[24px] p-5 tg-glass">
            <div className="flex items-center gap-6">
                <div className="relative flex h-[90px] w-[90px] shrink-0 items-center justify-center">
                    <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
                        {/* Background track circle */}
                        <circle
                            cx="45"
                            cy="45"
                            r={radius}
                            fill="none"
                            stroke={theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)"}
                            strokeWidth="8"
                        />
                        {categories.map((cat, i) => {
                            const pct = cat.count / total;
                            const dash = pct * circumference;
                            const gap = circumference - dash;
                            const o = offset;
                            offset += pct * circumference;
                            return (
                                <circle
                                    key={cat.key}
                                    cx="45"
                                    cy="45"
                                    r={radius}
                                    fill="none"
                                    stroke={colors[i % colors.length]}
                                    strokeWidth="8"
                                    strokeDasharray={`${dash} ${gap}`}
                                    strokeDashoffset={-o}
                                    strokeLinecap="round"
                                    style={{ transition: "stroke-dasharray 0.5s ease" }}
                                />
                            );
                        })}
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-[20px] font-black leading-none text-white">
                            {total}
                        </span>
                        <span className="mt-1 text-[8px] font-bold uppercase tracking-wider text-white/30">
                            TOTAL
                        </span>
                    </div>
                </div>
                <div className="flex-1 flex flex-col gap-2.5">
                    {categories.slice(0, 4).map((cat, i) => (
                        <div key={cat.key} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ background: colors[i % colors.length] }}
                                />
                                <span className="text-xs font-semibold text-white/70">
                                    {cat.label}
                                </span>
                            </div>
                            <span className="text-xs font-bold text-white/95">
                                {cat.count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// Main InsightsView
// ══════════════════════════════════════════════════════════════
export default function InsightsView() {
    const { units, theme } = useApp();
    const [sessions, setSessions] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [confirming, setConfirming] = useState(false);
    const [wiping, setWiping] = useState(false);
    const [activePhoto, setActivePhoto] = useState(null);

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
            setSessions([]);
            setPhotos([]);
        } finally {
            setWiping(false);
            setConfirming(false);
        }
    };

    // ── Computed stats ─────────────────────────────────────────
    const stats = useMemo(() => {
        const totalActualKm = sessions.reduce(
            (a, s) => a + (s.actualDistanceKm || (s.distance || 0) / 1000),
            0,
        );
        const totalDurationSec = sessions.reduce(
            (a, s) => a + (s.durationSec || 0),
            0,
        );

        const longestSession = sessions.reduce(
            (a, s) => Math.max(a, s.durationSec || 0),
            0,
        );
        const avgDuration =
            sessions.length > 0
                ? Math.round(totalDurationSec / sessions.length)
                : 0;

        // Unique places
        const placeNames = new Set(sessions.map((s) => s.destinationName));

        // Most visited
        const visitCounts = {};
        sessions.forEach((s) => {
            const n = s.destinationName;
            visitCounts[n] = (visitCounts[n] || 0) + 1;
        });
        const mostVisited = Object.entries(visitCounts).sort(
            (a, b) => b[1] - a[1],
        )[0];

        // Favourite category
        const catCounts = {};
        sessions.forEach((s) => {
            const k = s.categoryLabel || s.categoryKey;
            catCounts[k] = (catCounts[k] || 0) + 1;
        });
        const favCat = Object.entries(catCounts).sort(
            (a, b) => b[1] - a[1],
        )[0];

        const streaks = calculateStreaks(sessions);

        // Mode-specific
        const walkSessions = sessions.filter(
            (s) => (s.mode || "walk") === "walk",
        );
        const bikeSessions = sessions.filter((s) => s.mode === "bike");
        const carSessions = sessions.filter((s) => s.mode === "car");

        return {
            totalActualKm,
            totalDurationSec,

            longestSession,
            avgDuration,
            uniquePlaces: placeNames.size,
            mostVisited: mostVisited ? mostVisited[0] : null,
            favCat: favCat ? favCat[0] : null,
            streaks,
            walkCount: walkSessions.length,
            bikeCount: bikeSessions.length,
            carCount: carSessions.length,
            walkKm: walkSessions.reduce(
                (a, s) => a + (s.actualDistanceKm || (s.distance || 0) / 1000),
                0,
            ),
            bikeKm: bikeSessions.reduce(
                (a, s) => a + (s.actualDistanceKm || (s.distance || 0) / 1000),
                0,
            ),
        };
    }, [sessions]);

    // ── Heatmap (30 days) ──────────────────────────────────────
    const heat = useMemo(() => {
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            days.push({ date: d, count: 0, totalMin: 0 });
        }
        sessions.forEach((s) => {
            if (!s.startedAt) return;
            const d = new Date(s.startedAt);
            d.setHours(0, 0, 0, 0);
            const day = days.find((x) => x.date.getTime() === d.getTime());
            if (day) {
                day.count += 1;
                day.totalMin += (s.durationSec || 0) / 60;
            }
        });
        return days;
    }, [sessions]);
    const maxHeat = Math.max(1, ...heat.map((d) => d.totalMin || d.count));

    // ── Tooltip state for heatmap ──────────────────────────────
    const [heatTip, setHeatTip] = useState(null);

    return (
        <div
            data-testid="insights-view"
            className="relative h-[100dvh] w-full overflow-y-auto px-5 pt-safe pb-40 tg-no-select"
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
                {/* ── Hero stats grid ────────────────────────── */}
                <Section title="Overview">
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            label="Distance"
                            value={
                                stats.totalActualKm >= 1
                                    ? `${stats.totalActualKm.toFixed(1)}km`
                                    : `${Math.round(stats.totalActualKm * 1000)}m`
                            }
                            icon={Route}
                            color="emerald"
                        />
                        <StatCard
                            label="Sessions"
                            value={sessions.length}
                            icon={MapPin}
                            color="blue"
                        />
                        <StreakCard value={`${stats.streaks.current}d`} />
                        <StatCard
                            label="Time"
                            value={formatDuration(stats.totalDurationSec)}
                            icon={Clock}
                            color="cyan"
                        />
                        <StatCard
                            label="Avg Session"
                            value={formatDuration(stats.avgDuration)}
                            icon={TrendingUp}
                            color="rose"
                        />
                        <StatCard
                            label="Places"
                            value={stats.uniquePlaces}
                            icon={Star}
                            color="violet"
                        />
                    </div>
                </Section>

                {/* ── Weekly chart ───────────────────────────── */}
                <Section title="This Week">
                    <WeeklyChart sessions={sessions} units={units} theme={theme} />
                </Section>

                {/* ── Activity heatmap (30 days) ────────────── */}
                <Section title="Activity · 30 days">
                    <div className="rounded-[24px] p-5 tg-glass">
                        <div className="grid grid-cols-10 gap-2">
                            {heat.map((d, i) => {
                                const intensity =
                                    (d.totalMin || d.count) / maxHeat;
                                const active = d.count > 0;
                                return (
                                    <button
                                        key={i}
                                        className="aspect-square rounded-[8px] transition-transform active:scale-95 duration-200"
                                        style={{
                                            background: active
                                                ? `rgba(16, 185, 129, ${0.3 + intensity * 0.65})`
                                                : (theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)"),
                                            boxShadow: active
                                                ? `inset 0 0 0 1px rgba(16, 185, 129, 0.25), 0 0 ${4 + intensity * 8}px rgba(16, 185, 129, ${0.15 + intensity * 0.45})`
                                                : "none",
                                        }}
                                        onClick={() =>
                                            setHeatTip(
                                                heatTip?.i === i ? null : { ...d, i },
                                            )
                                        }
                                    />
                                );
                            })}
                        </div>
                        <AnimatePresence>
                            {heatTip && (
                                <motion.div
                                    key="tip"
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    className="mt-3 flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-white/70"
                                >
                                    <span className="font-semibold">
                                        {heatTip.date.toLocaleDateString(
                                            undefined,
                                            {
                                                weekday: "short",
                                                month: "short",
                                                day: "numeric",
                                            },
                                        )}
                                    </span>
                                    <span className="text-white/35">·</span>
                                    <span>
                                        {heatTip.count}{" "}
                                        {heatTip.count === 1
                                            ? "session"
                                            : "sessions"}
                                    </span>
                                    {heatTip.totalMin > 0 && (
                                        <>
                                            <span className="text-white/35">
                                                ·
                                            </span>
                                            <span>
                                                {Math.round(heatTip.totalMin)}{" "}
                                                min
                                            </span>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </Section>

                {/* ── Category breakdown ─────────────────────── */}
                {sessions.length > 0 && (
                    <Section title="Categories">
                        <CategoryDonut sessions={sessions} theme={theme} />
                    </Section>
                )}

                {/* ── Exploration highlights ─────────────────── */}
                {sessions.length > 0 && (
                    <Section title="Exploration">
                        <div className="rounded-3xl p-5 tg-glass">
                            <div className="flex flex-col gap-3">
                                {stats.favCat && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-white/50">
                                            Favorite Category
                                        </span>
                                        <span className="text-sm font-bold text-white">
                                            {stats.favCat}
                                        </span>
                                    </div>
                                )}
                                {stats.mostVisited && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-white/50">
                                            Most Visited
                                        </span>
                                        <span className="max-w-[55%] truncate text-sm font-bold text-white">
                                            {stats.mostVisited}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/50">
                                        Longest Session
                                    </span>
                                    <span className="text-sm font-bold text-white">
                                        {formatDuration(stats.longestSession)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/50">
                                        Avg Session
                                    </span>
                                    <span className="text-sm font-bold text-white">
                                        {formatDuration(stats.avgDuration)}
                                    </span>
                                </div>
                                {stats.streaks.longest > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-white/50">
                                            Best Streak
                                        </span>
                                        <span className="text-sm font-bold text-emerald-400">
                                            {stats.streaks.longest} days
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Section>
                )}

                {/* ── Mode breakdown ─────────────────────────── */}
                {sessions.length > 0 &&
                    (stats.walkCount > 0 ||
                        stats.bikeCount > 0 ||
                        stats.carCount > 0) && (
                        <Section title="By Mode">
                            <div className="flex flex-col gap-2">
                                {stats.walkCount > 0 && (
                                    <div className="flex items-center gap-3 rounded-2xl p-4 tg-glass">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                                            <Footprints size={16} strokeWidth={1.8} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white">
                                                Walking
                                            </div>
                                            <div className="text-[11px] text-white/45">
                                                {stats.walkCount} sessions ·{" "}
                                                {stats.walkKm.toFixed(1)} km
                                            </div>
                                        </div>

                                    </div>
                                )}
                                {stats.bikeCount > 0 && (
                                    <div className="flex items-center gap-3 rounded-2xl p-4 tg-glass">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                                            <Bike size={16} strokeWidth={1.8} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white">
                                                Cycling
                                            </div>
                                            <div className="text-[11px] text-white/45">
                                                {stats.bikeCount} sessions ·{" "}
                                                {stats.bikeKm.toFixed(1)} km
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {stats.carCount > 0 && (
                                    <div className="flex items-center gap-3 rounded-2xl p-4 tg-glass">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                                            <Car size={16} strokeWidth={1.8} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white">
                                                Driving
                                            </div>
                                            <div className="text-[11px] text-white/45">
                                                {stats.carCount} sessions
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Section>
                    )}

                {/* ── Sessions (rich cards) ──────────────────── */}
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
                                Pick a destination from the home screen to
                                begin.
                            </div>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {sessions.map((s) => {
                                const mode = s.mode || "walk";
                                const hasActual =
                                    s.actualDistanceKm != null &&
                                    s.actualDistanceKm > 0;
                                const distDisplay = hasActual
                                    ? `${s.actualDistanceKm.toFixed(2)} km`
                                    : formatDistance(s.distance, units);
                                const plannedDisplay =
                                    s.plannedDistanceKm != null
                                        ? `${s.plannedDistanceKm.toFixed(1)} km planned`
                                        : null;

                                return (
                                    <li
                                        key={s.id}
                                        className="rounded-2xl px-4 py-3 tg-glass"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Mode icon */}
                                            <div
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                                style={{
                                                    background: `${s.accent || "#10B981"}15`,
                                                    color:
                                                        s.accent || "#10B981",
                                                }}
                                            >
                                                <ModeIcon mode={mode} size={16} />
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-semibold text-white">
                                                    {s.destinationName}
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-white/45">
                                                    <span>
                                                        {new Date(
                                                            s.startedAt,
                                                        ).toLocaleString(
                                                            undefined,
                                                            {
                                                                month: "short",
                                                                day: "numeric",
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                            },
                                                        )}
                                                    </span>
                                                    {s.durationSec > 0 && (
                                                        <>
                                                            <span className="text-white/20">
                                                                ·
                                                            </span>
                                                            <span>
                                                                {formatDuration(
                                                                    s.durationSec,
                                                                )}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Distance */}
                                            <div className="text-right">
                                                <div className="text-xs font-semibold text-white/70">
                                                    {distDisplay}
                                                </div>
                                                {plannedDisplay && (
                                                    <div className="text-[10px] text-white/30">
                                                        {plannedDisplay}
                                                    </div>
                                                )}
                                                <div className="mt-0.5 flex items-center justify-end gap-1">
                                                    <span
                                                        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                                                        style={{
                                                            background:
                                                                theme === "light"
                                                                    ? (mode === "walk"
                                                                        ? "rgba(4, 120, 87, 0.15)"
                                                                        : mode === "bike"
                                                                            ? "rgba(29, 78, 216, 0.15)"
                                                                            : "rgba(109, 40, 217, 0.15)")
                                                                    : (mode === "walk"
                                                                        ? "rgba(16,185,129,0.12)"
                                                                        : mode ===
                                                                            "bike"
                                                                            ? "rgba(96,165,250,0.12)"
                                                                            : "rgba(167,139,250,0.12)"),
                                                            color:
                                                                theme === "light"
                                                                    ? (mode === "walk"
                                                                        ? "#047857"
                                                                        : mode === "bike"
                                                                            ? "#1d4ed8"
                                                                            : "#6d28d9")
                                                                    : (mode === "walk"
                                                                        ? "#6EE7B7"
                                                                        : mode ===
                                                                            "bike"
                                                                            ? "#93C5FD"
                                                                            : "#C4B5FD"),
                                                        }}
                                                    >
                                                        <ModeIcon
                                                            mode={mode}
                                                            size={8}
                                                        />
                                                        {MODE_LABELS[mode] ||
                                                            mode}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Speed row for walk+bike */}
                                        {(mode === "walk" || mode === "bike") &&
                                            s.averageSpeed > 0 && (
                                                <div className="mt-2 flex gap-3 border-t border-white/[0.04] pt-2">
                                                    <span className="flex items-center gap-1 text-[10px] text-white/40">
                                                        <TrendingUp
                                                            size={10}
                                                            className="text-emerald-400"
                                                        />
                                                        {formatSpeed(
                                                            s.averageSpeed,
                                                            units,
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Section>

                {/* ── Grass Gallery ──────────────────────────── */}
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
                                <button
                                    key={p.id}
                                    onClick={() => {
                                        haptics.tap();
                                        setActivePhoto(p);
                                    }}
                                    className="relative aspect-square overflow-hidden rounded-2xl tg-glass active:scale-95 transition-transform duration-200"
                                >
                                    <img
                                        src={p.dataUrl}
                                        alt=""
                                        className="absolute inset-0 h-full w-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </Section>

                {/* ── Storage / clear data ───────────────────── */}
                <Section title="Storage">
                    <div className="rounded-3xl p-5 tg-glass">
                        <div className="flex flex-col gap-4">
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    On-Device Storage
                                </div>
                                <div className="mt-2 text-[11px] leading-relaxed text-white/40">
                                    Sessions, photos, and preferences live
                                    locally in this browser. Clearing removes
                                    them permanently from this device.
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
                                className="w-full flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.04] text-xs font-bold text-white/50 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/15 transition-colors duration-200"
                            >
                                <Trash2 size={13} strokeWidth={2} />
                                Clear Data
                            </motion.button>
                        </div>
                    </div>
                </Section>
            </div>

            {/* ── Confirm wipe dialog ───────────────────────── */}
            <AnimatePresence>
                {confirming && (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-end justify-center px-5"
                        style={{
                            background: theme === "light" ? "rgba(213,213,220,0.5)" : "rgba(8,8,10,0.55)",
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

            {/* ── Active Photo Viewer Modal ─────────────────── */}
            <AnimatePresence>
                {activePhoto && (
                    <motion.div
                        key="photo-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-6"
                        style={{
                            background: theme === "light" ? "rgba(213,213,220,0.5)" : "rgba(8,8,10,0.7)",
                            backdropFilter: "blur(18px)",
                        }}
                        onClick={() => setActivePhoto(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 15 }}
                            transition={{
                                type: "spring",
                                stiffness: 350,
                                damping: 30,
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-sm rounded-[32px] p-4 tg-glass-strong shadow-2xl flex flex-col gap-4"
                        >
                            {/* Close button */}
                            <button
                                onClick={() => {
                                    haptics.tap();
                                    setActivePhoto(null);
                                }}
                                className="absolute right-6 top-6 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-md border border-white/10 active:scale-90 transition-transform"
                                aria-label="Close"
                            >
                                <X size={14} strokeWidth={2.2} />
                            </button>

                            {/* Image container */}
                            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-black/40 border border-white/5 shadow-inner">
                                <img
                                    src={activePhoto.dataUrl}
                                    alt="Grass moment"
                                    className="h-full w-full object-cover"
                                />
                            </div>

                            {/* Info */}
                            <div className="px-1 pb-1">
                                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
                                    Grass Verification
                                </div>
                                <div className="mt-1.5 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-white/90">
                                        {new Date(activePhoto.takenAt).toLocaleDateString(undefined, {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                            hour: "numeric",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        {(activePhoto.ratio * 100).toFixed(0)}% Green
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
