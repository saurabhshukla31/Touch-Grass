// Lightweight haptics helper. Reads the user preference from a module-local
// flag that the AppProvider keeps in sync. All call sites are no-ops if the
// device lacks the Vibration API (most desktops, iOS Safari) or if disabled.

let enabled = true;

export function setHapticsEnabled(v) {
    enabled = !!v;
}

function trigger(pattern) {
    if (!enabled) return;
    if (typeof navigator === "undefined") return;
    if (typeof navigator.vibrate !== "function") return;
    try {
        navigator.vibrate(pattern);
    } catch {
        /* ignore */
    }
}

// Presets — kept short and gentle to match the app's calm tone.
export const haptics = {
    tap: () => trigger(8),
    select: () => trigger(12),
    success: () => trigger([14, 30, 18]),
    warn: () => trigger([20, 40, 20]),
    arrive: () => trigger([24, 50, 24, 50, 40]),
    soft: () => trigger(6),
};
