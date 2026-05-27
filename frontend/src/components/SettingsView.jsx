import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Footprints, Bike, Car, Map, Navigation, Globe, Compass, Heart, Trees, Shield, Users, Sparkles, Sun, Moon, SunMoon } from "lucide-react";
import { useApp } from "@/lib/AppState";
import { haptics } from "@/lib/haptics";
import { APP_VERSION } from "@/lib/version";

function ModeSelector({ value, onChange }) {
    const modes = [
        { value: "explore", icon: Compass, color: "emerald", label: "Explore" },
        { value: "date", icon: Heart, color: "rose", label: "Date" },
        { value: "escape", icon: Trees, color: "cyan", label: "Escape" },
        { value: "social", icon: Users, color: "violet", label: "Social" },
        { value: "essentials", icon: Shield, color: "amber", label: "Essentials" },
    ];

    const activeColors = {
        emerald: "bg-emerald-500/25 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
        rose: "bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.25)]",
        cyan: "bg-cyan-500/25 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.25)]",
        amber: "bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
        violet: "bg-violet-500/25 text-violet-300 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.25)]",
    };

    const activeModeObj = modes.find((m) => m.value === value);
    const ActiveIcon = activeModeObj?.icon;
    const activeColorText = {
        emerald: "text-emerald-300 shadow-[inset_0_0_12px_rgba(16,185,129,0.1)] border-emerald-500/20 bg-emerald-500/5",
        rose: "text-rose-300 shadow-[inset_0_0_12px_rgba(244,63,94,0.1)] border-rose-500/20 bg-rose-500/5",
        cyan: "text-cyan-300 shadow-[inset_0_0_12px_rgba(6,182,212,0.1)] border-cyan-500/20 bg-cyan-500/5",
        amber: "text-amber-300 shadow-[inset_0_0_12px_rgba(245,158,11,0.1)] border-amber-500/20 bg-amber-500/5",
        violet: "text-violet-300 shadow-[inset_0_0_12px_rgba(139,92,246,0.1)] border-violet-500/20 bg-violet-500/5",
    }[activeModeObj?.color || "emerald"];

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex w-full justify-between items-center rounded-2xl bg-black/25 p-1.5 ring-1 ring-white/10 backdrop-blur-md">
                {modes.map((m) => {
                    const active = value === m.value;
                    const Icon = m.icon;
                    return (
                        <button
                            key={m.value}
                            data-testid={`mode-${m.value}`}
                            onClick={() => {
                                haptics.success();
                                onChange(m.value);
                            }}
                            className={`flex flex-col items-center justify-center rounded-[14px] aspect-square w-12 border transition-all duration-300 ${active
                                ? activeColors[m.color]
                                : "border-transparent text-white/60 hover:text-white/85 hover:bg-white/[0.04]"
                                }`}
                        >
                            <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                        </button>
                    );
                })}
            </div>
            <div className={`text-xs font-black uppercase tracking-[0.15em] border rounded-xl px-4 py-2.5 text-center min-h-[44px] flex items-center justify-center gap-2 transition-all duration-300 ${activeColorText}`}>
                {ActiveIcon && <ActiveIcon size={14} strokeWidth={2.5} />}
                {activeModeObj ? `${activeModeObj.label} Mode` : ""}
            </div>
        </div>
    );
}

function SegmentedIcon({ value, options, onChange, testIdPrefix }) {
    const activeColors = {
        emerald: "text-emerald-300",
        blue: "text-blue-300",
        amber: "text-amber-300",
        violet: "text-violet-300",
        cyan: "text-cyan-300",
    };
    return (
        <div className="flex w-full rounded-[18px] bg-black/25 p-1.5 ring-1 ring-white/10 backdrop-blur-md">
            {options.map((opt) => {
                const active = value === opt.value;
                const Icon = opt.icon;
                const iconColor = active ? (activeColors[opt.color] || "text-white") : "text-white/60 group-hover:text-white/80";
                return (
                    <button
                        key={opt.value}
                        data-testid={`${testIdPrefix}-${opt.value}`}
                        onClick={() => {
                            haptics.success();
                            onChange(opt.value);
                        }}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-[14px] py-2.5 transition-[background-color,color,box-shadow,border-color] duration-300 group ${active
                            ? "bg-white/15 text-white ring-1 ring-white/20 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                            : "text-white/60 hover:text-white/80 hover:bg-white/[0.04]"
                            }`}
                    >
                        {Icon && (
                            <Icon
                                size={opt.label ? 12 : 18}
                                strokeWidth={active ? 2.5 : 2}
                                className={`transition-colors duration-300 ${iconColor}`}
                            />
                        )}
                        {opt.label && (
                            <span className="text-[10px] font-bold uppercase tracking-normal whitespace-nowrap">
                                {opt.label}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function SettingItem({ label, icon: Icon, color = "emerald", children }) {
    const colors = {
        emerald: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
        blue: "bg-blue-500/10 text-blue-300 border border-blue-500/20",
        amber: "bg-amber-500/10 text-amber-300 border border-amber-500/20",
        rose: "bg-rose-500/10 text-rose-300 border border-rose-500/20",
        violet: "bg-violet-500/10 text-violet-300 border border-violet-500/20",
        cyan: "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20",
    };
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-white/80 ml-1">
                {Icon && (
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${colors[color] || colors.emerald}`}>
                        <Icon size={12} strokeWidth={2.2} />
                    </div>
                )}
                {label}
            </div>
            {children}
        </div>
    );
}

function ModeOverlayAnimation({ mode }) {
    // ✅ Hook must always run first
    const { theme } = useApp();

    // ✅ Conditional return AFTER hooks
    if (!mode) return null;

    const isLight = theme === "light";
    const Icon = mode.icon;

    // Accent colors — same in both themes, just intensity of the glow adapts
    const colors = {
        emerald: { accent: "#059669", dark: "text-emerald-300", light: "text-emerald-700", rgb: "5,150,105" },
        rose: { accent: "#e11d48", dark: "text-rose-300", light: "text-rose-700", rgb: "225,29,72" },
        cyan: { accent: "#0891b2", dark: "text-cyan-300", light: "text-cyan-700", rgb: "8,145,178" },
        violet: { accent: "#7c3aed", dark: "text-violet-300", light: "text-violet-700", rgb: "124,58,237" },
        amber: { accent: "#d97706", dark: "text-amber-300", light: "text-amber-700", rgb: "217,119,6" },
    }[mode.color] || {
        accent: "#6b7280",
        dark: "text-white",
        light: "text-gray-700",
        rgb: "107,114,128"
    };

    const { accent, rgb } = colors;
    const textClass = isLight ? colors.light : colors.dark;

    // Theme-specific surface values
    const bg = isLight ? "#f0f0f5" : "#060608";
    const orbAlpha1 = isLight ? "0.20" : "0.35";
    const orbAlpha2 = isLight ? "0.14" : "0.28";

    const cardBg = isLight
        ? `rgba(${rgb},0.07)`
        : `rgba(${rgb},0.08)`;

    const cardBorder = isLight
        ? `rgba(${rgb},0.30)`
        : `rgba(${rgb},0.25)`;

    const cardShadow = isLight
        ? `0 4px 40px rgba(${rgb},0.18), inset 0 1px 0 rgba(255,255,255,0.9)`
        : `0 0 60px rgba(${rgb},0.25), inset 0 1px 0 rgba(255,255,255,0.12)`;

    const eyebrowClass = isLight
        ? "text-black/35"
        : "text-white/35";

    const glareClass = isLight
        ? "absolute inset-0 rounded-[36px] pointer-events-none opacity-60 bg-gradient-to-br from-white/80 via-white/10 to-transparent"
        : "absolute inset-0 rounded-[36px] pointer-events-none opacity-30 bg-gradient-to-br from-white/20 via-transparent to-transparent";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
            style={{ backgroundColor: bg }}
        >
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{
                        scale: [1, 1.18, 1],
                        opacity: [
                            parseFloat(orbAlpha1),
                            parseFloat(orbAlpha1) + 0.15,
                            parseFloat(orbAlpha1)
                        ]
                    }}
                    transition={{
                        duration: 7,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute -top-1/2 -left-1/2 w-[160vw] h-[160vw] rounded-full"
                    style={{
                        background: `radial-gradient(circle, rgba(${rgb},${orbAlpha1}) 0%, transparent 65%)`,
                        filter: "blur(120px)"
                    }}
                />

                <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{
                        scale: [1.1, 0.9, 1.1],
                        opacity: [
                            parseFloat(orbAlpha2),
                            parseFloat(orbAlpha2) + 0.12,
                            parseFloat(orbAlpha2)
                        ]
                    }}
                    transition={{
                        duration: 9,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.5
                    }}
                    className="absolute -bottom-1/2 -right-1/2 w-[160vw] h-[160vw] rounded-full"
                    style={{
                        background: `radial-gradient(circle, rgba(${rgb},${orbAlpha2}) 0%, transparent 65%)`,
                        filter: "blur(130px)"
                    }}
                />
            </div>

            {/* Icon */}
            <div className="relative z-10 flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{
                        scale: [1, 1.6],
                        opacity: [isLight ? 0.25 : 0.18, 0]
                    }}
                    transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 0.4
                    }}
                    className="absolute rounded-full border"
                    style={{
                        width: 220,
                        height: 220,
                        borderColor: `rgba(${rgb}, 0.5)`
                    }}
                />

                <motion.div
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{
                        scale: [1, 1.35],
                        opacity: [isLight ? 0.35 : 0.28, 0]
                    }}
                    transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: 0.7
                    }}
                    className="absolute rounded-full border"
                    style={{
                        width: 180,
                        height: 180,
                        borderColor: `rgba(${rgb}, 0.5)`
                    }}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        duration: 0.6,
                        ease: [0.22, 1, 0.36, 1],
                        delay: 0.1
                    }}
                    className="absolute rounded-full"
                    style={{
                        width: 148,
                        height: 148,
                        background: `radial-gradient(circle, rgba(${rgb},${isLight ? "0.18" : "0.22"}) 0%, transparent 75%)`,
                        filter: "blur(12px)"
                    }}
                />

                <motion.div
                    initial={{ scale: 0, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{
                        type: "spring",
                        stiffness: 280,
                        damping: 22,
                        delay: 0.05
                    }}
                    className="relative flex items-center justify-center w-[120px] h-[120px] rounded-[36px]"
                    style={{
                        background: cardBg,
                        border: `1px solid ${cardBorder}`,
                        boxShadow: cardShadow,
                    }}
                >
                    <div className={glareClass} />

                    <motion.div
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 320,
                            damping: 20,
                            delay: 0.18
                        }}
                    >
                        <Icon
                            size={56}
                            strokeWidth={1.6}
                            style={{ color: accent }}
                        />
                    </motion.div>
                </motion.div>
            </div>

            {/* Text */}
            <div className="relative z-10 flex flex-col items-center text-center mt-14 px-8">
                <motion.p
                    initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                        duration: 0.5,
                        ease: [0.22, 1, 0.36, 1],
                        delay: 0.28
                    }}
                    className={`text-[11px] font-semibold uppercase tracking-[0.35em] ${eyebrowClass}`}
                >
                    {mode.label} Mode
                </motion.p>

                <motion.h2
                    initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                        duration: 0.55,
                        ease: [0.22, 1, 0.36, 1],
                        delay: 0.36
                    }}
                    className={`mt-1 text-[42px] font-black tracking-tight leading-none ${textClass}`}
                    style={{
                        textShadow: isLight
                            ? `0 0 30px rgba(${rgb}, 0.25)`
                            : `0 0 40px rgba(${rgb}, 0.4)`
                    }}
                >
                    {mode.label}
                </motion.h2>

                <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{
                        duration: 0.9,
                        ease: [0.22, 1, 0.36, 1],
                        delay: 0.42
                    }}
                    className="mt-8 w-16 h-[2px] rounded-full origin-center"
                    style={{
                        background: `rgba(${rgb}, ${isLight ? "0.5" : "0.6"})`
                    }}
                />
            </div>
        </motion.div>
    );
}

export default function SettingsView() {
    const {
        units,
        setUnits,
        travelMode,
        setTravelMode,
        mapViewMode,
        setMapViewMode,
        navViewMode,
        setNavViewMode,
        appMode,
        setAppMode,
        theme,
        setTheme,
        update,
    } = useApp();

    const [animatingMode, setAnimatingMode] = React.useState(null);

    const handleModeChange = (newMode) => {
        const modesList = [
            { value: "explore", icon: Compass, color: "emerald", label: "Explore" },
            { value: "date", icon: Heart, color: "rose", label: "Date" },
            { value: "escape", icon: Trees, color: "cyan", label: "Escape" },
            { value: "social", icon: Users, color: "violet", label: "Social" },
            { value: "essentials", icon: Shield, color: "amber", label: "Essentials" },
        ];
        const modeObj = modesList.find((m) => m.value === newMode);
        setAnimatingMode(modeObj);

        setTimeout(() => {
            setAppMode(newMode);
            update({ currentTab: "home" });
            setAnimatingMode(null);
        }, 1100);
    };

    return (
        <div
            data-testid="settings-view"
            className="relative h-[100dvh] w-full overflow-hidden px-6 pt-safe flex flex-col tg-no-select pb-[96px]"
        >
            <AnimatePresence>
                {animatingMode && <ModeOverlayAnimation mode={animatingMode} />}
            </AnimatePresence>
            <div className="tg-ambient" />

            <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 pt-4 pb-2 shrink-0 w-full max-w-[400px] mx-auto"
            >
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/50 flex items-center justify-between">
                    <span>Settings</span>
                    <span>V.{APP_VERSION}</span>
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                    How you touch grass.
                </h1>
            </motion.header>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 flex-1 flex flex-col justify-between mt-4 mb-2 min-h-0 w-full max-w-[400px] mx-auto"
            >
                <SettingItem label="Experience Mode" icon={Sparkles} color="emerald">
                    <ModeSelector
                        value={appMode}
                        onChange={handleModeChange}
                    />
                </SettingItem>

                <SettingItem label="Default Transport" icon={Footprints} color="emerald">
                    <SegmentedIcon
                        testIdPrefix="travel"
                        value={travelMode}
                        onChange={setTravelMode}
                        options={[
                            { value: "walking", icon: Footprints, color: "emerald" },
                            { value: "cycling", icon: Bike, color: "blue" },
                            { value: "driving", icon: Car, color: "violet" },
                        ]}
                    />
                </SettingItem>

                <div className="grid grid-cols-2 gap-3">
                    <SettingItem label="Map View" icon={Map} color="amber">
                        <SegmentedIcon
                            testIdPrefix="mapview"
                            value={mapViewMode}
                            onChange={setMapViewMode}
                            options={[
                                { value: "2d", label: "2D" },
                                { value: "3d", label: "3D" },
                            ]}
                        />
                    </SettingItem>

                    <SettingItem label="Navigation" icon={Navigation} color="violet">
                        <SegmentedIcon
                            testIdPrefix="navview"
                            value={navViewMode}
                            onChange={setNavViewMode}
                            options={[
                                { value: "2d", label: "2D" },
                                { value: "3d", label: "3D" },
                            ]}
                        />
                    </SettingItem>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <SettingItem label="Units" icon={Globe} color="cyan">
                        <SegmentedIcon
                            testIdPrefix="units"
                            value={units}
                            onChange={setUnits}
                            options={[
                                { value: "metric", label: "KM" },
                                { value: "imperial", label: "MI" },
                            ]}
                        />
                    </SettingItem>

                    <SettingItem label="Theme" icon={SunMoon} color="cyan">
                        <SegmentedIcon
                            testIdPrefix="theme"
                            value={theme}
                            onChange={setTheme}
                            options={[
                                { value: "light", icon: Sun, label: "Light", color: "amber" },
                                { value: "dark", icon: Moon, label: "Dark", color: "blue" },
                            ]}
                        />
                    </SettingItem>
                </div>
            </motion.div>
        </div>
    );
}
