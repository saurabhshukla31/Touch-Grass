import React from "react";
import { motion } from "framer-motion";
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
    } = useApp();


    return (
        <div
            data-testid="settings-view"
            className="relative h-[100dvh] w-full overflow-hidden px-6 pt-safe flex flex-col tg-no-select pb-[96px]"
        >
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
                        onChange={setAppMode}
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
