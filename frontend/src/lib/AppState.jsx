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
    pillOpen: false,
};

export function AppProvider({ children }) {
    const [state, setState] = useState(initial);
    const watchIdRef = useRef(null);
    const lastVectorRef = useRef({ cos: 0, sin: 0, initialized: false });

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
                let h = null;
                // Priority 1: iOS true-north calibrated compass
                if (typeof e.webkitCompassHeading === "number") {
                    h = e.webkitCompassHeading;
                } else if (e.alpha !== null && typeof e.alpha === "number") {
                    // Priority 2: Android alpha (deviceorientationabsolute gives true-north)
                    h = (360 - e.alpha + 360) % 360;
                }

                if (h === null || isNaN(h)) return;

                // Circular angular low-pass filter on unit vector
                const rad = (h * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                if (!lastVectorRef.current.initialized) {
                    lastVectorRef.current.cos = cos;
                    lastVectorRef.current.sin = sin;
                    lastVectorRef.current.initialized = true;
                } else {
                    const k = 0.8; // Smoothing factor (0.8 = smooth, 0.2 = fast/raw)
                    lastVectorRef.current.cos = lastVectorRef.current.cos * k + cos * (1 - k);
                    lastVectorRef.current.sin = lastVectorRef.current.sin * k + sin * (1 - k);
                }

                const smoothedRad = Math.atan2(lastVectorRef.current.sin, lastVectorRef.current.cos);
                const smoothedDeg = (smoothedRad * 180) / Math.PI;
                const normalizedHeading = (smoothedDeg + 360) % 360;

                setState((s) => ({ ...s, heading: normalizedHeading }));
            };

            // Use absolute device orientation if supported on Android to get actual true-north
            if ("ondeviceorientationabsolute" in window) {
                window.addEventListener("deviceorientationabsolute", handler, true);
            } else {
                window.addEventListener("deviceorientation", handler, true);
            }

            orientHandlerRef.current = handler;
            return true;
        } catch (e) {
            update({ orientationPermission: "denied" });
            return false;
        }
    }, [update]);

    const pillTimerRef = useRef(null);

    const togglePill = useCallback(() => {
        if (pillTimerRef.current) {
            clearTimeout(pillTimerRef.current);
            pillTimerRef.current = null;
        }
        setState((s) => {
            const nextOpen = !s.pillOpen;
            if (nextOpen) {
                pillTimerRef.current = setTimeout(() => {
                    setState((s2) => ({ ...s2, pillOpen: false }));
                    pillTimerRef.current = null;
                }, 3000);
            }
            return { ...s, pillOpen: nextOpen };
        });
    }, []);

    // Automatically manage pillOpen timer when destination changes or tab switches
    useEffect(() => {
        if (state.destination) {
            setState((s) => ({ ...s, pillOpen: true }));
            if (pillTimerRef.current) {
                clearTimeout(pillTimerRef.current);
            }
            pillTimerRef.current = setTimeout(() => {
                setState((s) => ({ ...s, pillOpen: false }));
                pillTimerRef.current = null;
            }, 3000);
        } else {
            setState((s) => ({ ...s, pillOpen: false }));
            if (pillTimerRef.current) {
                clearTimeout(pillTimerRef.current);
                pillTimerRef.current = null;
            }
        }
        return () => {
            if (pillTimerRef.current) {
                clearTimeout(pillTimerRef.current);
            }
        };
    }, [state.destination, state.currentTab]);

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
            pillOpen: false,
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
            togglePill,
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
            togglePill,
        ],
    );

    return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
    const ctx = useContext(AppCtx);
    if (!ctx) throw new Error("useApp must be used inside AppProvider");
    return ctx;
}
