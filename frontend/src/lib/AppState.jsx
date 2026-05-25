import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { getSettings, setSettings as persistSettings } from "@/lib/db";
import { setHapticsEnabled } from "@/lib/haptics";

const AppCtx = createContext(null);

const initial = {
    mode: "idle", // 'idle' | 'resolving' | 'active'
    currentTab: "compass", // 'compass' | 'map' | 'insights' | 'settings'
    homeOverlay: null, // 'insights' | 'settings' | null  (when idle and user opened those)
    selectedCategory: null, // category object from /lib/categories
    destination: null, // { name, address, lng, lat, ... }
    userLocation: null, // { lat, lng, accuracy, heading, speed, ts }
    travelMode: "walking",
    navStarted: false,
    units: "metric",
    hapticsEnabled: true,
    locationPermission: "unknown", // 'unknown' | 'granted' | 'denied'
    orientationPermission: "unknown",
    heading: null, // device heading degrees (0-360), magnetometer
    error: null,
};

export function AppProvider({ children }) {
    const [state, setState] = useState(initial);
    const watchIdRef = useRef(null);

    const update = useCallback((patch) => {
        setState((s) => ({ ...s, ...patch }));
    }, []);

    // Load persisted settings once.
    useEffect(() => {
        (async () => {
            try {
                const s = await getSettings();
                setHapticsEnabled(!!s.hapticsEnabled);
                setState((prev) => ({
                    ...prev,
                    units: s.units,
                    travelMode: s.defaultTravelMode,
                    hapticsEnabled: !!s.hapticsEnabled,
                }));
            } catch {
                /* ignore */
            }
        })();
    }, []);

    // Begin watching geolocation (call after permission granted).
    const startWatchingLocation = useCallback(() => {
        if (!("geolocation" in navigator)) {
            update({ locationPermission: "denied" });
            return;
        }
        if (watchIdRef.current != null) return;
        const id = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, accuracy, heading, speed } =
                    pos.coords;
                setState((s) => ({
                    ...s,
                    locationPermission: "granted",
                    userLocation: {
                        lat: latitude,
                        lng: longitude,
                        accuracy,
                        heading: Number.isFinite(heading) ? heading : null,
                        speed: Number.isFinite(speed) ? speed : null,
                        ts: pos.timestamp,
                    },
                }));
            },
            (err) => {
                setState((s) => ({
                    ...s,
                    locationPermission:
                        err.code === err.PERMISSION_DENIED
                            ? "denied"
                            : s.locationPermission,
                    error: err.message,
                }));
            },
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
        );
        watchIdRef.current = id;
    }, [update]);

    const stopWatchingLocation = useCallback(() => {
        if (watchIdRef.current != null && "geolocation" in navigator) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    }, []);

    // Ask once and start. Tries high-accuracy first, then falls back to a
    // low-accuracy attempt — some browser/headless contexts return errors
    // for high-accuracy requests even when permission is granted.
    const requestLocation = useCallback(
        () =>
            new Promise((resolve) => {
                if (!("geolocation" in navigator)) {
                    update({ locationPermission: "denied" });
                    resolve(null);
                    return;
                }
                const onSuccess = (pos) => {
                    const { latitude, longitude, accuracy, heading, speed } =
                        pos.coords;
                    const loc = {
                        lat: latitude,
                        lng: longitude,
                        accuracy,
                        heading: Number.isFinite(heading) ? heading : null,
                        speed: Number.isFinite(speed) ? speed : null,
                        ts: pos.timestamp,
                    };
                    setState((s) => ({
                        ...s,
                        locationPermission: "granted",
                        userLocation: loc,
                    }));
                    startWatchingLocation();
                    resolve(loc);
                };
                const tryLow = () => {
                    navigator.geolocation.getCurrentPosition(
                        onSuccess,
                        (err) => {
                            setState((s) => ({
                                ...s,
                                locationPermission:
                                    err.code === err.PERMISSION_DENIED
                                        ? "denied"
                                        : s.locationPermission,
                                error: err.message,
                            }));
                            // eslint-disable-next-line no-console
                            console.warn("[tg] geolocation low-accuracy failed", err);
                            resolve(null);
                        },
                        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
                    );
                };
                navigator.geolocation.getCurrentPosition(
                    onSuccess,
                    (err) => {
                        // eslint-disable-next-line no-console
                        console.warn(
                            "[tg] geolocation high-accuracy failed, retrying low-accuracy",
                            err,
                        );
                        tryLow();
                    },
                    { enableHighAccuracy: true, timeout: 8000 },
                );
            }),
        [startWatchingLocation, update],
    );

    // Device orientation (compass heading) — needs explicit permission on iOS.
    const orientHandlerRef = useRef(null);
    const requestOrientation = useCallback(async () => {
        try {
            const Need =
                typeof DeviceOrientationEvent !== "undefined" &&
                typeof DeviceOrientationEvent.requestPermission === "function";
            if (Need) {
                const result = await DeviceOrientationEvent.requestPermission();
                update({
                    orientationPermission:
                        result === "granted" ? "granted" : "denied",
                });
                if (result !== "granted") return false;
            } else {
                update({ orientationPermission: "granted" });
            }
            if (orientHandlerRef.current) return true;
            const handler = (e) => {
                // webkitCompassHeading is provided on iOS and is already true-north
                // calibrated (0 = North, increasing clockwise).
                let h = null;
                if (typeof e.webkitCompassHeading === "number") {
                    h = e.webkitCompassHeading;
                } else if (typeof e.alpha === "number") {
                    h = 360 - e.alpha;
                }
                if (h != null) {
                    setState((s) => ({ ...s, heading: ((h % 360) + 360) % 360 }));
                }
            };
            window.addEventListener("deviceorientationabsolute", handler, true);
            window.addEventListener("deviceorientation", handler, true);
            orientHandlerRef.current = handler;
            return true;
        } catch (e) {
            update({ orientationPermission: "denied" });
            return false;
        }
    }, [update]);

    useEffect(
        () => () => {
            stopWatchingLocation();
            if (orientHandlerRef.current) {
                window.removeEventListener(
                    "deviceorientationabsolute",
                    orientHandlerRef.current,
                    true,
                );
                window.removeEventListener(
                    "deviceorientation",
                    orientHandlerRef.current,
                    true,
                );
                orientHandlerRef.current = null;
            }
        },
        [stopWatchingLocation],
    );

    const setUnits = useCallback(async (units) => {
        setState((s) => ({ ...s, units }));
        try {
            await persistSettings({ units });
        } catch {
            /* ignore */
        }
    }, []);

    const setTravelMode = useCallback(async (travelMode) => {
        setState((s) => ({ ...s, travelMode }));
        try {
            await persistSettings({ defaultTravelMode: travelMode });
        } catch {
            /* ignore */
        }
    }, []);

    const setHaptics = useCallback(async (hapticsEnabled) => {
        setHapticsEnabled(hapticsEnabled);
        setState((s) => ({ ...s, hapticsEnabled }));
        try {
            await persistSettings({ hapticsEnabled });
        } catch {
            /* ignore */
        }
    }, []);

    const resetSession = useCallback(() => {
        setState((s) => ({
            ...s,
            mode: "idle",
            selectedCategory: null,
            destination: null,
            navStarted: false,
            homeOverlay: null,
            currentTab: "compass",
        }));
    }, []);

    const value = useMemo(
        () => ({
            ...state,
            update,
            requestLocation,
            startWatchingLocation,
            stopWatchingLocation,
            requestOrientation,
            setUnits,
            setTravelMode,
            setHaptics,
            resetSession,
        }),
        [
            state,
            update,
            requestLocation,
            startWatchingLocation,
            stopWatchingLocation,
            requestOrientation,
            setUnits,
            setTravelMode,
            setHaptics,
            resetSession,
        ],
    );

    return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
    const ctx = useContext(AppCtx);
    if (!ctx) throw new Error("useApp must be used inside AppProvider");
    return ctx;
}
