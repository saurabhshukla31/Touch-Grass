import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { motion, AnimatePresence } from "framer-motion";
import { Footprints, Bike, Car, Play, Square, X, Navigation2 } from "lucide-react";
import { useApp } from "@/lib/AppState";
import {
    getMapboxToken,
    hasMapboxToken,
    fetchRoute,
} from "@/lib/mapbox";
import DestinationPill from "@/components/DestinationPill";
import {
    formatDistance,
    formatDuration,
    haversineMeters,
    etaSecondsFromDistance,
} from "@/lib/geo";
import { haptics } from "@/lib/haptics";

const PROFILES = [
    { key: "walking", label: "Walk", Icon: Footprints },
    { key: "cycling", label: "Bike", Icon: Bike },
    { key: "driving", label: "Drive", Icon: Car },
];

const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

export default function MapView({ onEnd }) {
    const {
        userLocation,
        destination,
        selectedCategory,
        travelMode,
        setTravelMode,
        navStarted,
        update,
        units,
    } = useApp();

    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const userMarkerRef = useRef(null);
    const destMarkerRef = useRef(null);
    const [route, setRoute] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState(null);
    const [mapReady, setMapReady] = useState(false);

    const tokenAvailable = hasMapboxToken();

    // Init map once. We intentionally don't reinit when location/destination
    // change — the map updates marker positions through other effects.
    useEffect(() => {
        if (!tokenAvailable) return;
        if (!containerRef.current || mapRef.current) return;
        mapboxgl.accessToken = getMapboxToken();
        const start =
            userLocation || destination || { lng: 0, lat: 20 };
        const map = new mapboxgl.Map({
            container: containerRef.current,
            style: MAP_STYLE,
            center: [start.lng, start.lat],
            zoom: 15,
            attributionControl: false,
            logoPosition: "bottom-left",
            pitchWithRotate: false,
            dragRotate: false,
        });
        map.on("load", () => {
            // Lightly customize the dark style — keep roads visible.
            try {
                const layers = map.getStyle().layers || [];
                layers.forEach((l) => {
                    if (!l) return;
                    if (
                        l.type === "line" &&
                        /road|street|highway/i.test(l.id)
                    ) {
                        try {
                            map.setPaintProperty(l.id, "line-color", "#3A3A42");
                        } catch {
                            /* ignore */
                        }
                    }
                    if (l.type === "symbol") {
                        try {
                            map.setPaintProperty(
                                l.id,
                                "text-color",
                                "rgba(255,255,255,0.62)",
                            );
                            map.setPaintProperty(
                                l.id,
                                "text-halo-color",
                                "rgba(0,0,0,0.85)",
                            );
                        } catch {
                            /* ignore */
                        }
                    }
                });
            } catch {
                /* ignore */
            }
            setMapReady(true);
            // Defensive: the container is laid out inside an AnimatePresence
            // transition, so its size may have been smaller at construction.
            // Force a resize once everything has settled.
            requestAnimationFrame(() => map.resize());
            setTimeout(() => map.resize(), 300);
        });
        mapRef.current = map;

        // Keep the canvas in sync with container size changes (e.g. when the
        // bottom card grows / address bar collapses).
        const ro = new ResizeObserver(() => {
            try {
                map.resize();
            } catch {
                /* ignore */
            }
        });
        ro.observe(containerRef.current);

        return () => {
            ro.disconnect();
            map.remove();
            mapRef.current = null;
            setMapReady(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tokenAvailable]);

    // User marker
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady || !userLocation) return;
        if (!userMarkerRef.current) {
            const el = document.createElement("div");
            el.setAttribute("data-testid", "user-marker");
            el.style.cssText =
                "width:22px;height:22px;border-radius:50%;background:#10B981;box-shadow:0 0 0 6px rgba(16,185,129,0.18),0 0 18px rgba(16,185,129,0.55);border:2px solid #08080A;";
            const wrap = document.createElement("div");
            wrap.style.cssText = "position:relative;";
            const pulse = document.createElement("div");
            pulse.style.cssText =
                "position:absolute;inset:-12px;border-radius:50%;background:rgba(16,185,129,0.22);";
            pulse.className = "tg-pulse";
            wrap.appendChild(pulse);
            wrap.appendChild(el);
            const marker = new mapboxgl.Marker({ element: wrap })
                .setLngLat([userLocation.lng, userLocation.lat])
                .addTo(map);
            userMarkerRef.current = marker;
        } else {
            userMarkerRef.current.setLngLat([
                userLocation.lng,
                userLocation.lat,
            ]);
        }
    }, [userLocation, mapReady]);

    // Destination marker
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady || !destination) return;
        if (!destMarkerRef.current) {
            const el = document.createElement("div");
            el.setAttribute("data-testid", "dest-marker");
            el.style.cssText = `position:relative;width:34px;height:34px;border-radius:14px;background:rgba(20,20,24,0.85);border:1px solid ${
                selectedCategory?.accent || "#10B981"
            };display:flex;align-items:center;justify-content:center;backdrop-filter:blur(20px);box-shadow:0 8px 24px rgba(0,0,0,0.5),0 0 0 4px rgba(16,185,129,0.08);`;
            el.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:${
                selectedCategory?.accent || "#10B981"
            };"></div>`;
            const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
                .setLngLat([destination.lng, destination.lat])
                .addTo(map);
            destMarkerRef.current = marker;
        } else {
            destMarkerRef.current.setLngLat([
                destination.lng,
                destination.lat,
            ]);
        }
    }, [destination, mapReady, selectedCategory]);

    // Fetch route on travel-mode change, or when the user has moved far enough
    // from where the last route was computed. This avoids the "Calculating…"
    // flicker every GPS tick.
    const lastFetchRef = useRef(null);
    useEffect(() => {
        if (!userLocation || !destination || !tokenAvailable) return;

        const last = lastFetchRef.current;
        const sameProfile = last && last.profile === travelMode;
        const sameDest =
            last && last.destLat === destination.lat && last.destLng === destination.lng;
        if (last && sameProfile && sameDest) {
            const moved = haversineMeters(userLocation, {
                lat: last.fromLat,
                lng: last.fromLng,
            });
            // Skip refetch if user hasn't moved meaningfully. 25 m for walking
            // is plenty; the haversine display below stays live regardless.
            if (moved < 25) return;
        }

        const ac = new AbortController();
        // Only surface the "Calculating…" state for the very first fetch.
        // Subsequent silent refetches keep the previous values in view.
        const firstFetch = !route;
        if (firstFetch) setRouteLoading(true);

        fetchRoute({
            from: userLocation,
            to: destination,
            profile: travelMode,
            signal: ac.signal,
        })
            .then((r) => {
                if (!r) {
                    if (firstFetch) {
                        setRoute(null);
                        setRouteError("No route");
                    }
                    return;
                }
                setRoute(r);
                setRouteError(null);
                lastFetchRef.current = {
                    fromLat: userLocation.lat,
                    fromLng: userLocation.lng,
                    destLat: destination.lat,
                    destLng: destination.lng,
                    profile: travelMode,
                };
            })
            .catch((e) => {
                if (e.name === "AbortError") return;
                if (firstFetch) setRouteError(e.message || "Route error");
            })
            .finally(() => {
                if (firstFetch) setRouteLoading(false);
            });
        return () => ac.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        userLocation?.lat,
        userLocation?.lng,
        destination?.lat,
        destination?.lng,
        travelMode,
        tokenAvailable,
    ]);

    // Reset cached fetch state when destination changes (new session).
    useEffect(() => {
        lastFetchRef.current = null;
        setRoute(null);
        setRouteError(null);
    }, [destination?.lat, destination?.lng]);

    // Draw route line.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;
        const SRC = "tg-route";
        const LINE = "tg-route-line";
        const GLOW = "tg-route-glow";
        try {
            if (route && route.geometry) {
                const data = {
                    type: "Feature",
                    properties: {},
                    geometry: route.geometry,
                };
                if (map.getSource(SRC)) {
                    map.getSource(SRC).setData(data);
                } else {
                    map.addSource(SRC, { type: "geojson", data });
                    map.addLayer({
                        id: GLOW,
                        type: "line",
                        source: SRC,
                        layout: { "line-cap": "round", "line-join": "round" },
                        paint: {
                            "line-color":
                                selectedCategory?.accent || "#10B981",
                            "line-width": 10,
                            "line-opacity": 0.18,
                            "line-blur": 6,
                        },
                    });
                    map.addLayer({
                        id: LINE,
                        type: "line",
                        source: SRC,
                        layout: { "line-cap": "round", "line-join": "round" },
                        paint: {
                            "line-color":
                                selectedCategory?.accent || "#10B981",
                            "line-width": 4,
                            "line-opacity": 0.95,
                        },
                    });
                }
            } else if (map.getSource(SRC)) {
                if (map.getLayer(LINE)) map.removeLayer(LINE);
                if (map.getLayer(GLOW)) map.removeLayer(GLOW);
                map.removeSource(SRC);
            }
        } catch (e) {
            /* ignore */
        }
    }, [route, mapReady, selectedCategory]);

    // Camera behavior: in preview (not started) fit bounds; in active follow user.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;
        if (!userLocation || !destination) return;
        if (!navStarted) {
            if (route && route.geometry) {
                const coords = route.geometry.coordinates;
                const lngs = coords.map((c) => c[0]);
                const lats = coords.map((c) => c[1]);
                map.fitBounds(
                    [
                        [Math.min(...lngs), Math.min(...lats)],
                        [Math.max(...lngs), Math.max(...lats)],
                    ],
                    { padding: 90, duration: 700, maxZoom: 16 },
                );
            } else {
                map.easeTo({
                    center: [userLocation.lng, userLocation.lat],
                    zoom: 14,
                    duration: 600,
                });
            }
        } else {
            map.easeTo({
                center: [userLocation.lng, userLocation.lat],
                zoom: 17,
                pitch: 55,
                bearing: userLocation.heading || 0,
                duration: 500,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        navStarted,
        route,
        userLocation?.lat,
        userLocation?.lng,
        destination?.lat,
        destination?.lng,
        mapReady,
    ]);

    // Live distance + ETA. We base the display on the most recent route the
    // engine returned, then subtract the haversine progress between where the
    // route was fetched and where the user is right now. This gives a smooth,
    // monotonic countdown without a refetch on every GPS tick.
    const { distance, duration } = useMemo(() => {
        if (!route)
            return { distance: null, duration: null };
        const last = lastFetchRef.current;
        if (!last || !userLocation) {
            return { distance: route.distance, duration: route.duration };
        }
        const moved = haversineMeters(userLocation, {
            lat: last.fromLat,
            lng: last.fromLng,
        });
        const remainingDist = Math.max(0, route.distance - moved);
        // Maintain the same average pace from the original route.
        const pace =
            route.distance > 0 ? route.duration / route.distance : 0;
        let remainingDur = pace > 0 ? remainingDist * pace : route.duration;
        if (!Number.isFinite(remainingDur) || remainingDur < 0) {
            remainingDur = etaSecondsFromDistance(
                remainingDist,
                travelMode,
                userLocation.speed || 0,
            );
        }
        return { distance: remainingDist, duration: remainingDur };
    }, [route, userLocation, travelMode]);

    const nextStep = useMemo(() => {
        if (!route || !route.steps || !route.steps.length) return null;
        return route.steps[0];
    }, [route]);

    if (!tokenAvailable) {
        return (
            <div
                data-testid="map-token-missing"
                className="relative flex h-[100dvh] flex-col items-center justify-center px-8 pb-32 text-center tg-no-select"
            >
                <div className="tg-ambient" />
                <div className="rounded-3xl p-8 tg-glass-strong max-w-sm">
                    <Navigation2
                        size={28}
                        className="mx-auto mb-4 text-emerald-300"
                    />
                    <div className="text-base font-bold text-white">
                        Map needs a Mapbox token
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-white/55">
                        Add{" "}
                        <code className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-emerald-300">
                            REACT_APP_MAPBOX_API_KEY
                        </code>{" "}
                        to enable the map. The Compass tab works without it.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            data-testid="map-view"
            className="relative h-[100dvh] w-full overflow-hidden tg-no-select"
        >
            <div
                ref={containerRef}
                className="absolute inset-0 h-full w-full"
                style={{ background: "#08080A" }}
            />
            {/* Subtle vignette only — keeps the map mostly visible. */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(120% 80% at 50% 50%, transparent 50%, rgba(8,8,10,0.55) 100%)",
                }}
            />

            {/* Destination pill on map — sits above bottom card */}
            <div className="absolute left-0 right-0 top-0 z-20 flex justify-center pt-safe">
                <div className="pt-3">
                    <DestinationPill
                        category={selectedCategory}
                        destination={destination}
                        distance={distance}
                        units={units}
                        anchor="top"
                    />
                </div>
            </div>

            {/* Turn-by-turn (active nav) */}
            <AnimatePresence>
                {navStarted && nextStep && (
                    <motion.div
                        key="ttb"
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        className="absolute left-4 right-4 top-16 z-30 rounded-2xl p-4 tg-glass-strong"
                        data-testid="turn-by-turn"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                                <Navigation2 size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-semibold text-white">
                                    {nextStep.maneuver?.instruction ||
                                        "Continue"}
                                </div>
                                <div className="mt-0.5 text-[11px] text-white/45">
                                    {formatDistance(
                                        nextStep.distance,
                                        units,
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom info card */}
            <div
                className="absolute inset-x-4 z-30"
                style={{
                    bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 28 }}
                    className="rounded-3xl p-5 tg-glass-strong"
                    data-testid="map-info-card"
                >
                    <div className="flex items-baseline justify-between">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                                {selectedCategory?.label || ""}
                            </div>
                            <div
                                data-testid="map-route-distance"
                                className="mt-1 text-2xl font-black tracking-tight text-white"
                            >
                                {routeLoading
                                    ? "Calculating…"
                                    : routeError
                                      ? "Route unavailable"
                                      : formatDistance(distance, units)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                                ETA
                            </div>
                            <div
                                data-testid="map-route-eta"
                                className="mt-1 text-2xl font-black tracking-tight text-white"
                            >
                                {formatDuration(duration)}
                            </div>
                        </div>
                    </div>

                    {!navStarted && (
                        <div className="mt-4 flex gap-1.5 rounded-2xl bg-white/[0.04] p-1">
                            {PROFILES.map(({ key, label, Icon }) => {
                                const active = travelMode === key;
                                return (
                                    <button
                                        key={key}
                                        data-testid={`travel-mode-${key}`}
                                        onClick={() => {
                                            haptics.tap();
                                            setTravelMode(key);
                                        }}
                                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold transition-colors ${
                                            active
                                                ? "bg-white/10 text-white ring-1 ring-white/10"
                                                : "text-white/45"
                                        }`}
                                    >
                                        <Icon size={14} strokeWidth={1.8} />
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-4 flex gap-2">
                        {!navStarted ? (
                            <button
                                data-testid="start-navigation"
                                disabled={!route || routeLoading}
                                onClick={() => {
                                    haptics.success();
                                    update({ navStarted: true });
                                }}
                                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-500/90 px-4 py-3 text-sm font-bold text-black active:scale-[0.98] disabled:opacity-40"
                            >
                                <Play size={14} strokeWidth={2.4} />
                                Start
                            </button>
                        ) : (
                            <button
                                data-testid="end-navigation"
                                onClick={() => {
                                    haptics.soft();
                                    onEnd?.();
                                }}
                                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/10 active:scale-[0.98]"
                            >
                                <Square size={12} strokeWidth={2.4} />
                                End
                            </button>
                        )}
                        <button
                            data-testid="map-cancel"
                            onClick={() => {
                                haptics.tap();
                                onEnd?.();
                            }}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/55 ring-1 ring-white/10 active:scale-95"
                            aria-label="Cancel"
                        >
                            <X size={14} strokeWidth={1.8} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
