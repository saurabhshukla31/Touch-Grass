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
import { MODES } from "@/lib/categories";

const AppCtx = createContext(null);

const initial = {
    mode: "idle", // 'idle' | 'resolving' | 'active'
    currentTab: "home", // 'home' | 'compass' | 'map' | 'insights' | 'settings'
    homeOverlay: null, // 'insights' | 'settings' | null
    selectedCategory: null, 
    destination: null, // { name, address, lng, lat, ... }
    userLocation: null, // { lat, lng, accuracy, heading, speed, ts }
    travelMode: "walking",
    navStarted: false,
    sessionStartedAt: null, 
    units: "metric",
    hapticsEnabled: true,
    mapViewMode: "2d",
    navViewMode: "3d",
    appMode: "explore",
    animatingMode: null,
    locationPermission: "unknown", // 'unknown' | 'granted' | 'denied'
    orientationPermission: "unknown",
    heading: null, 
    error: null,
    pillOpen: false,
    theme: "dark",
};

export function AppProvider({ children }) {
    const [state, setState] = useState(initial);
    const watchIdRef = useRef(null);
    const lastVectorRef = useRef({ cos: 0, sin: 0, initialized: false });
    const headingRef = useRef(null);
    const headingListeners = useRef(new Set());

    const subscribeHeading = useCallback((cb) => {
        headingListeners.current.add(cb);
        if (headingRef.current !== null) {
            cb(headingRef.current);
        }
        return () => {
            headingListeners.current.delete(cb);
        };
    }, []);

    const update = useCallback((patch) => {
        setState((s) => ({ ...s, ...patch }));
    }, []);

    // Load persisted settings cleanly on mount
    useEffect(() => {
        (async () => {
            try {
                const s = await getSettings();
                
                // FIX: Respect the user's saved preference instead of hardcoding 'true'
                const isHapticTrue = s.hapticsEnabled !== false; 
                setHapticsEnabled(isHapticTrue);

                const currentTheme = s.theme || "dark";

                setState((prev) => ({
                    ...prev,
                    units: s.units,
                    travelMode: s.defaultTravelMode,
                    hapticsEnabled: isHapticTrue,
                    mapViewMode: s.mapViewMode || "2d",
                    navViewMode: s.navViewMode || "3d",
                    appMode: s.appMode || "explore",
                    theme: currentTheme,
                }));
            } catch {
                /* ignore */
            }
        })();
    }, []);

    // Begin watching geolocation
    const startWatchingLocation = useCallback(() => {
        if (!("geolocation" in navigator)) {
            update({ locationPermission: "denied" });
            return;
        }
        if (watchIdRef.current != null) return;
        const id = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, accuracy, heading, speed } = pos.coords;
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

    // Fallback geolocation execution sequence
    const requestLocation = useCallback(
        () =>
            new Promise((resolve) => {
                if (!("geolocation" in navigator)) {
                    update({ locationPermission: "denied" });
                    resolve(null);
                    return;
                }
                const onSuccess = (pos) => {
                    const { latitude, longitude, accuracy, heading, speed } = pos.coords;
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
                            console.warn("[tg] geolocation low-accuracy failed", err);
                            resolve(null);
                        },
                        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
                    );
                };
                navigator.geolocation.getCurrentPosition(
                    onSuccess,
                    (err) => {
                        console.warn("[tg] geolocation high-accuracy failed, trying fallback", err);
                        tryLow();
                    },
                    { enableHighAccuracy: true, timeout: 8000 },
                );
            }),
        [startWatchingLocation, update],
    );

    // Device orientation event stream pipeline
    const orientHandlerRef = useRef(null);
    const requestOrientation = useCallback(async () => {
        try {
            const Need =
                typeof DeviceOrientationEvent !== "undefined" &&
                typeof DeviceOrientationEvent.requestPermission === "function";
            if (Need) {
                const result = await DeviceOrientationEvent.requestPermission();
                update({
                    orientationPermission: result === "granted" ? "granted" : "denied",
                });
                if (result !== "granted") return false;
            } else {
                update({ orientationPermission: "granted" });
            }
            if (orientHandlerRef.current) return true;
            const handler = (e) => {
                let h = null;
                if (typeof e.webkitCompassHeading === "number") {
                    h = e.webkitCompassHeading;
                } else if (e.alpha !== null && typeof e.alpha === "number") {
                    h = (360 - e.alpha + 360) % 360;
                }

                if (h === null || isNaN(h)) return;

                // Circular angular low-pass filter on unit vector coordinates
                const rad = (h * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                if (!lastVectorRef.current.initialized) {
                    lastVectorRef.current.cos = cos;
                    lastVectorRef.current.sin = sin;
                    lastVectorRef.current.initialized = true;
                } else {
                    const k = 0.8; 
                    lastVectorRef.current.cos = lastVectorRef.current.cos * k + cos * (1 - k);
                    lastVectorRef.current.sin = lastVectorRef.current.sin * k + sin * (1 - k);
                }

                const smoothedRad = Math.atan2(lastVectorRef.current.sin, lastVectorRef.current.cos);
                const smoothedDeg = (smoothedRad * 180) / Math.PI;
                const normalizedHeading = (smoothedDeg + 360) % 360;

                headingRef.current = normalizedHeading;
                headingListeners.current.forEach((cb) => cb(normalizedHeading));
            };

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

    useEffect(() => {
        if (!state.destination) {
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
                window.removeEventListener("deviceorientationabsolute", orientHandlerRef.current, true);
                window.removeEventListener("deviceorientation", orientHandlerRef.current, true);
                orientHandlerRef.current = null;
            }
        },
        [stopWatchingLocation],
    );

    useEffect(() => {
        if (!state.theme) return;
        if (state.theme === "light") {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
        } else {
            document.documentElement.classList.remove("light");
            document.documentElement.classList.add("dark");
        }
    }, [state.theme]);

    useEffect(() => {
        if (!state.appMode) return;
        const root = document.documentElement;
        
        const modeParams = {
            explore: {
                accent: "#10b981",
                rgb: "16,185,129",
                glowTop: "rgba(16,185,129,0.14)",
                glowBottom: "rgba(56,189,248,0.06)",
                glowTopLight: "rgba(16,185,129,0.08)",
                glowBottomLight: "rgba(56,189,248,0.04)"
            },
            date: {
                accent: "#f43f5e",
                rgb: "244,63,94",
                glowTop: "rgba(244,63,94,0.14)",
                glowBottom: "rgba(245,158,11,0.06)",
                glowTopLight: "rgba(244,63,94,0.08)",
                glowBottomLight: "rgba(245,158,11,0.04)"
            },
            escape: {
                accent: "#06b6d4",
                rgb: "6,182,212",
                glowTop: "rgba(6,182,212,0.14)",
                glowBottom: "rgba(16,185,129,0.06)",
                glowTopLight: "rgba(6,182,212,0.08)",
                glowBottomLight: "rgba(16,185,129,0.04)"
            },
            social: {
                accent: "#a855f7",
                rgb: "139,92,246",
                glowTop: "rgba(139,92,246,0.14)",
                glowBottom: "rgba(244,63,94,0.06)",
                glowTopLight: "rgba(139,92,246,0.08)",
                glowBottomLight: "rgba(244,63,94,0.04)"
            },
            essentials: {
                accent: "#f59e0b",
                rgb: "245,158,11",
                glowTop: "rgba(245,158,11,0.14)",
                glowBottom: "rgba(59,130,246,0.06)",
                glowTopLight: "rgba(245,158,11,0.08)",
                glowBottomLight: "rgba(59,130,246,0.04)"
            }
        };

        const config = modeParams[state.appMode] || modeParams.explore;

        root.style.setProperty("--mode-accent", config.accent);
        root.style.setProperty("--mode-accent-rgb", config.rgb);
        root.style.setProperty("--mode-glow-top", config.glowTop);
        root.style.setProperty("--mode-glow-bottom", config.glowBottom);
        root.style.setProperty("--mode-glow-top-light", config.glowTopLight);
        root.style.setProperty("--mode-glow-bottom-light", config.glowBottomLight);
    }, [state.appMode]);

    const setTheme = useCallback(async (theme) => {
        setState((s) => ({ ...s, theme }));
        try { await persistSettings({ theme }); } catch { /* ignore */ }
    }, []);

    const setUnits = useCallback(async (units) => {
        setState((s) => ({ ...s, units }));
        try { await persistSettings({ units }); } catch { /* ignore */ }
    }, []);

    const setTravelMode = useCallback(async (travelMode) => {
        setState((s) => ({ ...s, travelMode }));
        try { await persistSettings({ defaultTravelMode: travelMode }); } catch { /* ignore */ }
    }, []);

    const setMapViewMode = useCallback(async (mapViewMode) => {
        setState((s) => ({ ...s, mapViewMode }));
        try { await persistSettings({ mapViewMode }); } catch { /* ignore */ }
    }, []);

    const setNavViewMode = useCallback(async (navViewMode) => {
        setState((s) => ({ ...s, navViewMode }));
        try { await persistSettings({ navViewMode }); } catch { /* ignore */ }
    }, []);

    const setAppMode = useCallback(async (appMode) => {
        setState((s) => ({ ...s, appMode }));
        try { await persistSettings({ appMode }); } catch { /* ignore */ }
    }, []);

    const changeAppMode = useCallback((newMode) => {
        const modeObj = MODES[newMode];
        if (!modeObj) return;
        setState((s) => ({ ...s, animatingMode: modeObj }));
        setTimeout(() => {
            setState((s) => ({
                ...s,
                appMode: newMode,
                currentTab: "home",
                animatingMode: null,
            }));
            persistSettings({ appMode: newMode }).catch(() => {});
        }, 1100);
    }, []);

    const resetSession = useCallback(() => {
        setState((s) => ({
            ...s,
            mode: "idle",
            selectedCategory: null,
            destination: null,
            navStarted: false,
            sessionStartedAt: null,
            homeOverlay: null,
            currentTab: "insights",
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
            setMapViewMode,
            setNavViewMode,
            setAppMode,
            changeAppMode,
            resetSession,
            togglePill,
            subscribeHeading,
            setTheme,
        }),
        [state, update, requestLocation, startWatchingLocation, stopWatchingLocation, requestOrientation, setUnits, setTravelMode, setMapViewMode, setNavViewMode, setAppMode, changeAppMode, resetSession, togglePill, subscribeHeading, setTheme]
    );

    return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
    const ctx = useContext(AppCtx);
    if (!ctx) throw new Error("useApp must be used inside AppProvider");
    return ctx;
}