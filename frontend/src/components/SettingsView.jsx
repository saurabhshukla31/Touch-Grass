import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Footprints, Bike, Car, Map, Navigation, Globe } from "lucide-react";
import { useApp } from "@/lib/AppState";
import { haptics } from "@/lib/haptics";

function SegmentedIcon({ value, options, onChange, testIdPrefix }) {
    const activeColors = {
        emerald: "text-emerald-400",
        blue: "text-blue-400",
        amber: "text-amber-400",
        violet: "text-violet-400",
        cyan: "text-cyan-400",
    };
    return (
        <div className="flex w-full rounded-[18px] bg-black/20 p-1.5 ring-1 ring-white/5 backdrop-blur-md">
            {options.map((opt) => {
                const active = value === opt.value;
                const Icon = opt.icon;
                const iconColor = active ? (activeColors[opt.color] || "text-white") : "text-white/40 group-hover:text-white/60";
                return (
                    <button
                        key={opt.value}
                        data-testid={`${testIdPrefix}-${opt.value}`}
                        onClick={() => {
                            haptics.tap();
                            onChange(opt.value);
                        }}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-[14px] py-2.5 transition-[background-color,color,box-shadow,border-color] duration-300 group ${
                            active
                                ? "bg-white/15 text-white ring-1 ring-white/20 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                                : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
                        }`}
                    >
                        {Icon && (
                            <Icon 
                                size={opt.label ? 14 : 18} 
                                strokeWidth={active ? 2.5 : 2} 
                                className={`transition-colors duration-300 ${iconColor}`}
                            />
                        )}
                        {opt.label && (
                            <span className="text-[11px] font-bold uppercase tracking-wider">
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
        emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15",
        blue: "bg-blue-500/10 text-blue-400 border border-blue-500/15",
        amber: "bg-amber-500/10 text-amber-400 border border-amber-500/15",
        rose: "bg-rose-500/10 text-rose-400 border border-rose-500/15",
        violet: "bg-violet-500/10 text-violet-400 border border-violet-500/15",
        cyan: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15",
    };
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 ml-1">
                {Icon && (
                    <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${colors[color] || colors.emerald}`}>
                        <Icon size={13} strokeWidth={2.2} />
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
    } = useApp();

    const [draftUnits, setDraftUnits] = useState(units);
    const [draftMode, setDraftMode] = useState(travelMode);
    const [draftMapMode, setDraftMapMode] = useState(mapViewMode);
    const [draftNavMode, setDraftNavMode] = useState(navViewMode);
    const [saving, setSaving] = useState(false);

    useEffect(() => setDraftUnits(units), [units]);
    useEffect(() => setDraftMode(travelMode), [travelMode]);
    useEffect(() => setDraftMapMode(mapViewMode), [mapViewMode]);
    useEffect(() => setDraftNavMode(navViewMode), [navViewMode]);

    const dirty =
        draftUnits !== units ||
        draftMode !== travelMode ||
        draftMapMode !== mapViewMode ||
        draftNavMode !== navViewMode;

    const onSave = async () => {
        setSaving(true);
        try {
            if (draftUnits !== units) await setUnits(draftUnits);
            if (draftMode !== travelMode) await setTravelMode(draftMode);
            if (draftMapMode !== mapViewMode) await setMapViewMode(draftMapMode);
            if (draftNavMode !== navViewMode) await setNavViewMode(draftNavMode);
            haptics.success();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            data-testid="settings-view"
            className="relative h-[100dvh] w-full overflow-hidden px-5 pt-safe flex flex-col tg-no-select pb-[110px]"
        >
            <div className="tg-ambient" />
            
            <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 pt-8 pb-4 shrink-0"
            >
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
                    Settings
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                    How you touch grass.
                </h1>
            </motion.header>

            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 flex-1 flex flex-col justify-center min-h-0"
            >
                <div className="relative overflow-hidden rounded-[32px] p-6 bg-white/[0.03] shadow-2xl ring-1 ring-white/10 backdrop-blur-xl flex flex-col gap-6 before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none">
                    <SettingItem label="Measurement System" icon={Globe} color="cyan">
                        <SegmentedIcon
                            testIdPrefix="units"
                            value={draftUnits}
                            onChange={setDraftUnits}
                            options={[
                                { value: "metric", label: "Metric" },
                                { value: "imperial", label: "Imperial" },
                            ]}
                        />
                    </SettingItem>

                    <SettingItem label="Default Transport" icon={Footprints} color="emerald">
                        <SegmentedIcon
                            testIdPrefix="travel"
                            value={draftMode}
                            onChange={setDraftMode}
                            options={[
                                { value: "walking", icon: Footprints, color: "emerald" },
                                { value: "cycling", icon: Bike, color: "blue" },
                                { value: "driving", icon: Car, color: "violet" },
                            ]}
                        />
                    </SettingItem>

                    <div className="grid grid-cols-2 gap-4">
                        <SettingItem label="Map View" icon={Map} color="amber">
                            <SegmentedIcon
                                testIdPrefix="mapview"
                                value={draftMapMode}
                                onChange={setDraftMapMode}
                                options={[
                                    { value: "2d", label: "2D" },
                                    { value: "3d", label: "3D" },
                                ]}
                            />
                        </SettingItem>

                        <SettingItem label="Navigation" icon={Navigation} color="violet">
                            <SegmentedIcon
                                testIdPrefix="navview"
                                value={draftNavMode}
                                onChange={setDraftNavMode}
                                options={[
                                    { value: "2d", label: "2D" },
                                    { value: "3d", label: "3D" },
                                ]}
                            />
                        </SettingItem>
                    </div>
                </div>
            </motion.div>

            <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid="settings-save"
                disabled={!dirty || saving}
                onClick={onSave}
                whileTap={{ scale: 0.98 }}
                className={`mt-4 relative z-10 flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl text-sm font-black tracking-wide transition-[background-color,color,box-shadow,border-color] duration-300 ${
                    dirty && !saving
                        ? "bg-emerald-500 text-black shadow-[0_8px_30px_-10px_rgba(16,185,129,0.5)] ring-1 ring-emerald-400"
                        : "bg-white/[0.04] text-white/30 ring-1 ring-white/5"
                }`}
            >
                <Check size={18} strokeWidth={3} className={dirty ? "opacity-100" : "opacity-0 absolute"} />
                {saving ? "SAVING..." : dirty ? "SAVE CHANGES" : "UP TO DATE"}
            </motion.button>
        </div>
    );
}
