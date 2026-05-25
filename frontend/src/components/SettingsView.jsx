import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/AppState";
import { haptics } from "@/lib/haptics";

function Segmented({ value, options, onChange, testIdPrefix }) {
    return (
        <div
            className="grid gap-1 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/[0.04]"
            style={{
                gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
            }}
        >
            {options.map((opt) => {
                const active = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        data-testid={`${testIdPrefix}-${opt.value}`}
                        onClick={() => {
                            haptics.tap();
                            onChange(opt.value);
                        }}
                        className={`rounded-xl px-3 py-2.5 text-[12px] font-semibold transition-colors ${
                            active
                                ? "bg-white/10 text-white ring-1 ring-white/10"
                                : "text-white/50"
                        }`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

function Row({ label, children, hint }) {
    return (
        <div className="rounded-3xl p-5 tg-glass">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                {label}
            </div>
            <div className="mt-3">{children}</div>
            {hint && (
                <div className="mt-3 text-[11px] leading-relaxed text-white/40">
                    {hint}
                </div>
            )}
        </div>
    );
}

function Toggle({ value, onChange, testid }) {
    return (
        <button
            data-testid={testid}
            onClick={() => {
                if (!value) haptics.select();
                onChange(!value);
            }}
            aria-pressed={value}
            className="relative flex h-8 w-14 items-center rounded-full ring-1 ring-white/10 transition-colors"
            style={{
                background: value
                    ? "linear-gradient(180deg, rgba(16,185,129,0.85), rgba(16,185,129,0.65))"
                    : "rgba(255,255,255,0.06)",
                boxShadow: value
                    ? "inset 0 1px 0 rgba(255,255,255,0.25), 0 0 16px -4px rgba(16,185,129,0.45)"
                    : "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
        >
            <motion.span
                layout
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="ml-1 h-6 w-6 rounded-full bg-white shadow-md"
                style={{
                    transform: value ? "translateX(24px)" : "translateX(0)",
                }}
            />
        </button>
    );
}

export default function SettingsView() {
    const {
        units,
        setUnits,
        travelMode,
        setTravelMode,
        hapticsEnabled,
        setHaptics,
    } = useApp();

    // Local draft so the Save button has something to commit.
    const [draftUnits, setDraftUnits] = useState(units);
    const [draftMode, setDraftMode] = useState(travelMode);
    const [draftHaptics, setDraftHaptics] = useState(hapticsEnabled);
    const [saving, setSaving] = useState(false);

    useEffect(() => setDraftUnits(units), [units]);
    useEffect(() => setDraftMode(travelMode), [travelMode]);
    useEffect(() => setDraftHaptics(hapticsEnabled), [hapticsEnabled]);

    const dirty =
        draftUnits !== units ||
        draftMode !== travelMode ||
        draftHaptics !== hapticsEnabled;

    const onSave = async () => {
        setSaving(true);
        try {
            if (draftUnits !== units) await setUnits(draftUnits);
            if (draftMode !== travelMode) await setTravelMode(draftMode);
            if (draftHaptics !== hapticsEnabled) await setHaptics(draftHaptics);
            haptics.success();
            toast.success("Settings saved.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            data-testid="settings-view"
            className="relative min-h-[100dvh] w-full overflow-y-auto px-5 pt-safe pb-40 tg-no-select"
        >
            <div className="tg-ambient" />
            <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 pt-6 pb-6"
            >
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
                    Settings
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                    Quiet preferences.
                </h1>
            </motion.header>

            <div className="relative z-10 flex flex-col gap-3">
                <Row label="Units">
                    <Segmented
                        testIdPrefix="units"
                        value={draftUnits}
                        onChange={setDraftUnits}
                        options={[
                            { value: "metric", label: "Metric" },
                            { value: "imperial", label: "Imperial" },
                        ]}
                    />
                </Row>

                <Row label="Default travel mode">
                    <Segmented
                        testIdPrefix="travel"
                        value={draftMode}
                        onChange={setDraftMode}
                        options={[
                            { value: "walking", label: "Walk" },
                            { value: "cycling", label: "Bike" },
                            { value: "driving", label: "Drive" },
                        ]}
                    />
                </Row>

                <div className="rounded-3xl p-5 tg-glass">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                                Haptics
                            </div>
                            <div className="mt-1.5 text-sm font-semibold text-white">
                                {draftHaptics ? "On" : "Off"}
                            </div>
                            <div className="mt-1 text-[11px] leading-relaxed text-white/40">
                                Subtle vibration on taps, arrivals, and route
                                changes.
                            </div>
                        </div>
                        <Toggle
                            testid="haptics-toggle"
                            value={draftHaptics}
                            onChange={setDraftHaptics}
                        />
                    </div>
                </div>

                <motion.button
                    data-testid="settings-save"
                    disabled={!dirty || saving}
                    onClick={onSave}
                    whileTap={{ scale: 0.98 }}
                    className={`mt-2 flex h-14 items-center justify-center gap-2 rounded-full text-sm font-bold transition-opacity ${
                        dirty && !saving
                            ? "bg-emerald-500/90 text-black"
                            : "bg-white/[0.06] text-white/35"
                    }`}
                    style={{
                        boxShadow:
                            dirty && !saving
                                ? "0 16px 40px -12px rgba(16,185,129,0.55), inset 0 1px 0 rgba(255,255,255,0.25)"
                                : "inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                >
                    <Check size={16} strokeWidth={2.4} />
                    {saving ? "Saving…" : dirty ? "Save" : "Saved"}
                </motion.button>
            </div>
        </div>
    );
}
