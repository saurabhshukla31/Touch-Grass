// Pure geo helpers. All inputs are real coordinates from device GPS / Mapbox.

const R = 6371000; // earth radius, meters
const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

export function haversineMeters(a, b) {
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Initial bearing from a -> b, in degrees [0, 360).
export function initialBearing(a, b) {
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const dLng = toRad(b.lng - a.lng);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function cardinal(bearing) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(bearing / 45) % 8];
}

// Mode pace in meters per second, used as fallback ETA when no live speed.
const PACE = { walking: 1.35, cycling: 4.5, driving: 11.1 };

export function etaSecondsFromDistance(meters, mode = "walking", liveMps = 0) {
    const pace = liveMps && liveMps > 0.3 ? liveMps : PACE[mode] || PACE.walking;
    return meters / pace;
}

export function formatDistance(meters, units = "metric") {
    if (meters == null || Number.isNaN(meters)) return "—";
    if (units === "imperial") {
        const feet = meters * 3.28084;
        if (feet < 1000) return `${Math.round(feet)} ft`;
        const miles = feet / 5280;
        return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
    }
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatDuration(seconds) {
    if (seconds == null || !Number.isFinite(seconds)) return "—";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatSpeed(kmh, units = "metric") {
    if (kmh == null || !Number.isFinite(kmh)) return "—";
    if (units === "imperial") return `${(kmh * 0.621371).toFixed(1)} mph`;
    return `${kmh.toFixed(1)} km/h`;
}

// Map internal travel mode keys to session mode labels
export const MODE_MAP = {
    walking: "walk",
    cycling: "bike",
    driving: "car",
};

export const MODE_LABELS = {
    walk: "Walk",
    bike: "Bike",
    car: "Car",
};

/**
 * Calculate current streak of consecutive days with at least one session.
 * @param {Array} sessions — sorted newest-first
 * @returns {{ current: number, longest: number }}
 */
export function calculateStreaks(sessions) {
    if (!sessions.length) return { current: 0, longest: 0 };

    // Collect unique active day timestamps (midnight-normalized)
    const daySet = new Set();
    sessions.forEach((s) => {
        if (!s.startedAt) return;
        const d = new Date(s.startedAt);
        d.setHours(0, 0, 0, 0);
        daySet.add(d.getTime());
    });

    const days = [...daySet].sort((a, b) => b - a); // newest first
    const ONE_DAY = 86400000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Current streak: starts from today or yesterday
    let current = 0;
    let check = todayMs;
    // Allow starting from today or yesterday
    if (days[0] === todayMs || days[0] === todayMs - ONE_DAY) {
        check = days[0];
        for (const d of days) {
            if (d === check) {
                current++;
                check -= ONE_DAY;
            } else if (d < check) {
                break;
            }
        }
    }

    // Longest streak ever
    let longest = 0;
    let run = 1;
    for (let i = 1; i < days.length; i++) {
        if (days[i - 1] - days[i] === ONE_DAY) {
            run++;
        } else {
            longest = Math.max(longest, run);
            run = 1;
        }
    }
    longest = Math.max(longest, run, current);

    return { current, longest };
}
