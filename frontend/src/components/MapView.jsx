import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

// ✅ THE FIX: Changed to a generic eslint-disable comment so the compiler doesn't throw a definition error.
// eslint-disable-next-line
import mapboxgl from "!mapbox-gl";

import { motion, AnimatePresence } from "framer-motion";
import {
    Footprints,
    Bike,
    Car,
    Play,
    Square,
    X,
    Navigation2,
    LocateFixed,
} from "lucide-react";

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

const STEP_ADVANCE_METERS = 25;

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
        heading,
        mapViewMode,
        navViewMode,
    } = useApp();

    const containerRef = useRef(null);
    const mapRef = useRef(null);

    const userMarkerRef = useRef(null);
    const destMarkerRef = useRef(null);

    const lastFetchRef = useRef(null);

    const [route, setRoute] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [trackingMode, setTrackingMode] = useState(true);

    const [currentStepIdx, setCurrentStepIdx] = useState(0);

    const tokenAvailable = hasMapboxToken();

    const deviceHeading = useMemo(() => {
        if (
            userLocation &&
            userLocation.speed !== null &&
            userLocation.speed > 0.8 &&
            userLocation.heading !== null
        ) {
            return userLocation.heading;
        }
        return heading ?? 0;
    }, [userLocation, heading]);

    useEffect(() => {
        if (navStarted) {
            setTrackingMode(true);
        }
    }, [navStarted]);

    const accentColor =
        selectedCategory?.accent ?? "#10B981";

    useEffect(() => {
        if (!tokenAvailable) return;

        let animationFrameId;
        let mapInstance;
        let resizeObserver;

        const initializeMap = () => {
            if (!containerRef.current || mapRef.current) return;

            const { clientWidth, clientHeight } = containerRef.current;
            if (clientWidth === 0 || clientHeight === 0) {
                animationFrameId = requestAnimationFrame(initializeMap);
                return;
            }

            mapboxgl.accessToken = getMapboxToken();

            const start =
                userLocation ??
                destination ?? {
                    lng: 0,
                    lat: 20,
                };

            mapInstance = new mapboxgl.Map({
                container: containerRef.current,
                style: MAP_STYLE,
                center: [start.lng, start.lat],
                zoom: 15,
                pitch: mapViewMode === "3d" ? 60 : 0,
                attributionControl: false,
                logoPosition: "bottom-left",
                pitchWithRotate: false,
                dragRotate: false,
            });

            mapInstance.on("load", () => {
                try {
                    const layers =
                        mapInstance.getStyle().layers ?? [];

                    layers.forEach((l) => {
                        if (!l) return;

                        if (
                            l.type === "line" &&
                            /road|street|highway/i.test(l.id)
                        ) {
                            try {
                                mapInstance.setPaintProperty(
                                    l.id,
                                    "line-color",
                                    "#4D4E58"
                                );
                            } catch { }
                        }

                        if (l.type === "symbol") {
                            try {
                                mapInstance.setPaintProperty(
                                    l.id,
                                    "text-color",
                                    "rgba(255,255,255,0.62)"
                                );

                                mapInstance.setPaintProperty(
                                    l.id,
                                    "text-halo-color",
                                    "rgba(0,0,0,0.85)"
                                );
                            } catch { }
                        }
                    });

                    // Add 3D buildings layer
                    const labelLayerId = layers.find(
                        (layer) => layer.type === "symbol" && layer.layout["text-field"]
                    )?.id;

                    mapInstance.addLayer(
                        {
                            id: "3d-buildings",
                            source: "composite",
                            "source-layer": "building",
                            filter: ["==", "extrude", "true"],
                            type: "fill-extrusion",
                            minzoom: 15,
                            paint: {
                                "fill-extrusion-color": "#111218",
                                "fill-extrusion-height": [
                                    "interpolate",
                                    ["linear"],
                                    ["zoom"],
                                    15,
                                    0,
                                    15.05,
                                    ["get", "height"],
                                ],
                                "fill-extrusion-base": [
                                    "interpolate",
                                    ["linear"],
                                    ["zoom"],
                                    15,
                                    0,
                                    15.05,
                                    ["get", "min_height"],
                                ],
                                "fill-extrusion-opacity": 0.85,
                            },
                        },
                        labelLayerId
                    );
                } catch { }

                setMapReady(true);

                requestAnimationFrame(() => {
                    mapInstance.resize();
                });

                setTimeout(() => {
                    mapInstance?.resize();
                }, 500);

                setTimeout(() => {
                    mapInstance?.resize();
                }, 1200);

                window.addEventListener("resize", () => {
                    mapInstance?.resize();
                });
            });

            mapRef.current = mapInstance;

            mapInstance.on("dragstart", () => setTrackingMode(false));
            mapInstance.on("touchstart", () => setTrackingMode(false));
            mapInstance.on("wheel", () => setTrackingMode(false));

            resizeObserver = new ResizeObserver(() => {
                try {
                    mapInstance?.resize();
                } catch { }
            });

            resizeObserver.observe(containerRef.current);
        };

        initializeMap();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (resizeObserver) resizeObserver.disconnect();

            userMarkerRef.current?.remove();
            destMarkerRef.current?.remove();

            userMarkerRef.current = null;
            destMarkerRef.current = null;

            if (mapInstance) {
                mapInstance.remove();
            }

            mapRef.current = null;
            setMapReady(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tokenAvailable]);

    useEffect(() => {
        const map = mapRef.current;

        if (!map || !mapReady) return;

        if (!userLocation) {
            userMarkerRef.current?.remove();
            userMarkerRef.current = null;
            return;
        }

        const beamHeading = deviceHeading;
        const hasHeading = true;

        if (!userMarkerRef.current) {
            const wrap = document.createElement("div");
            wrap.style.cssText = "position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;";

            const pulse = document.createElement("div");
            pulse.style.cssText = `position:absolute;width:40px;height:40px;border-radius:50%;background:${accentColor};opacity:0.15;z-index:0;`;
            pulse.className = "tg-pulse";

            const beam = document.createElement("div");
            beam.className = "tg-heading-beam";
            beam.style.cssText = `position:absolute;inset:-24px;display:flex;align-items:center;justify-content:center;z-index:1;transform:rotate(${beamHeading}deg);transition:transform 0.25s ease-out;opacity:${hasHeading ? 1 : 0};`;
            beam.innerHTML = `
                <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                    <path d="M36 36 L20 4 A24 24 0 0 1 52 4 Z" fill="url(#beam-gradient)" opacity="0.4" />
                    <defs>
                        <linearGradient id="beam-gradient" x1="36" y1="36" x2="36" y2="4" gradientUnits="userSpaceOnUse">
                            <stop stop-color="${accentColor}" stop-opacity="1"/>
                            <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
                        </linearGradient>
                    </defs>
                </svg>
            `;

            const dotRing = document.createElement("div");
            dotRing.style.cssText = "width:20px;height:20px;border-radius:50%;background:#ffffff;box-shadow:0 3px 8px rgba(0,0,0,0.35);border:2px solid #08080A;display:flex;align-items:center;justify-content:center;z-index:2;";
            dotRing.setAttribute("data-testid", "user-marker");

            const innerDot = document.createElement("div");
            innerDot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${accentColor};`;
            dotRing.appendChild(innerDot);

            wrap.appendChild(pulse);
            wrap.appendChild(beam);
            wrap.appendChild(dotRing);

            userMarkerRef.current = new mapboxgl.Marker({
                element: wrap,
            })
                .setLngLat([userLocation.lng, userLocation.lat])
                .addTo(map);
        } else {
            const marker = userMarkerRef.current;
            marker.setLngLat([userLocation.lng, userLocation.lat]);

            const wrap = marker.getElement();
            const beam = wrap.querySelector(".tg-heading-beam");
            if (beam) {
                beam.style.transform = `rotate(${beamHeading}deg)`;
                beam.style.opacity = hasHeading ? "1" : "0";
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userLocation, mapReady, accentColor]);

    useEffect(() => {
        const map = mapRef.current;

        if (!map || !mapReady) return;

        if (!destination) {
            destMarkerRef.current?.remove();
            destMarkerRef.current = null;
            return;
        }

        if (!destMarkerRef.current) {
            const el = document.createElement("div");

            el.setAttribute(
                "data-testid",
                "dest-marker"
            );

            el.style.cssText =
                `position:relative;width:34px;height:34px;border-radius:14px;` +
                `background:rgba(20,20,24,0.85);border:1px solid ${accentColor};` +
                `display:flex;align-items:center;justify-content:center;` +
                `backdrop-filter:blur(20px);` +
                `box-shadow:0 8px 24px rgba(0,0,0,0.5),0 0 0 4px rgba(16,185,129,0.08);`;

            const dot =
                document.createElement("div");

            dot.setAttribute(
                "data-role",
                "dest-dot"
            );

            dot.style.cssText =
                `width:8px;height:8px;border-radius:50%;background:${accentColor};`;

            el.appendChild(dot);

            destMarkerRef.current =
                new mapboxgl.Marker({
                    element: el,
                    anchor: "center",
                })
                    .setLngLat([
                        destination.lng,
                        destination.lat,
                    ])
                    .addTo(map);
        } else {
            destMarkerRef.current.setLngLat([
                destination.lng,
                destination.lat,
            ]);

            const el =
                destMarkerRef.current.getElement();

            if (el) {
                el.style.borderColor =
                    accentColor;

                const dot = el.querySelector(
                    "[data-role='dest-dot']"
                );

                if (dot) {
                    dot.style.background =
                        accentColor;
                }
            }
        }
    }, [destination, mapReady, accentColor]);

    useEffect(() => {
        if (
            !userLocation ||
            !destination ||
            !tokenAvailable
        ) {
            return;
        }

        const last = lastFetchRef.current;

        const routeResetNeeded =
            !last ||
            last.destLat !== destination.lat ||
            last.destLng !== destination.lng ||
            last.profile !== travelMode;

        if (routeResetNeeded) {
            lastFetchRef.current = null;

            setRoute(null);
            setRouteError(null);
            setCurrentStepIdx(0);
        }

        const updatedLast =
            lastFetchRef.current;

        if (updatedLast) {
            const sameProfile =
                updatedLast.profile ===
                travelMode;

            const sameDest =
                updatedLast.destLat ===
                destination.lat &&
                updatedLast.destLng ===
                destination.lng;

            if (sameProfile && sameDest) {
                const moved =
                    haversineMeters(
                        userLocation,
                        {
                            lat: updatedLast.fromLat,
                            lng: updatedLast.fromLng,
                        }
                    );

                if (moved < 25) return;
            }
        }

        const firstFetch =
            !lastFetchRef.current;

        if (firstFetch) {
            setRouteLoading(true);
        }

        const ac = new AbortController();

        fetchRoute({
            from: userLocation,
            to: destination,
            profile: travelMode,
            signal: ac.signal,
        })
            .then((r) => {
                if (!r) {
                    if (firstFetch) {
                        setRouteError(
                            "No route found"
                        );
                    }

                    return;
                }

                setRoute(r);
                setRouteError(null);
                setCurrentStepIdx(0);

                lastFetchRef.current = {
                    fromLat: userLocation.lat,
                    fromLng: userLocation.lng,
                    destLat: destination.lat,
                    destLng: destination.lng,
                    profile: travelMode,
                };
            })
            .catch((e) => {
                if (
                    e?.name === "AbortError"
                ) {
                    return;
                }

                if (firstFetch) {
                    setRouteError(
                        e.message ??
                        "Route error"
                    );
                }
            })
            .finally(() => {
                if (firstFetch) {
                    setRouteLoading(false);
                }
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

    useEffect(() => {
        if (
            !navStarted ||
            !route?.steps?.length ||
            !userLocation
        ) {
            return;
        }

        const steps = route.steps;

        if (
            currentStepIdx >=
            steps.length - 1
        ) {
            return;
        }

        const step =
            steps[currentStepIdx];

        const maneuver =
            step?.maneuver?.location;

        if (!maneuver) return;

        const dist = haversineMeters(
            userLocation,
            {
                lat: maneuver[1],
                lng: maneuver[0],
            }
        );

        if (
            dist <= STEP_ADVANCE_METERS
        ) {
            setCurrentStepIdx((i) =>
                Math.min(
                    i + 1,
                    steps.length - 1
                )
            );
        }
    }, [
        userLocation,
        navStarted,
        route,
        currentStepIdx,
    ]);

    useEffect(() => {
        const map = mapRef.current;

        if (!map || !mapReady) return;

        const SRC = "tg-route";
        const LINE = "tg-route-line";
        const CASING = "tg-route-casing";
        const GLOW = "tg-route-glow";

        try {
            if (route?.geometry) {
                const rawCoords = route.geometry.coordinates;
                const coords = userLocation
                    ? [[userLocation.lng, userLocation.lat], ...rawCoords]
                    : rawCoords;

                const data = {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "LineString",
                        coordinates: coords,
                    },
                };

                if (map.getSource(SRC)) {
                    map.getSource(SRC).setData(data);

                    if (map.getLayer(GLOW)) {
                        map.setPaintProperty(GLOW, "line-color", accentColor);
                    }
                    if (map.getLayer(LINE)) {
                        map.setPaintProperty(LINE, "line-color", accentColor);
                    }
                } else {
                    map.addSource(SRC, {
                        type: "geojson",
                        data,
                    });

                    map.addLayer({
                        id: GLOW,
                        type: "line",
                        source: SRC,
                        layout: {
                            "line-cap": "round",
                            "line-join": "round",
                        },
                        paint: {
                            "line-color": accentColor,
                            "line-width": 6,
                            "line-opacity": 0.25,
                            "line-blur": 3,
                        },
                    });

                    map.addLayer({
                        id: CASING,
                        type: "line",
                        source: SRC,
                        layout: {
                            "line-cap": "round",
                            "line-join": "round",
                        },
                        paint: {
                            "line-color": "#08080A",
                            "line-width": 7,
                            "line-opacity": 0.85,
                        },
                    });

                    map.addLayer({
                        id: LINE,
                        type: "line",
                        source: SRC,
                        layout: {
                            "line-cap": "round",
                            "line-join": "round",
                        },
                        paint: {
                            "line-color": accentColor,
                            "line-width": 3.5,
                            "line-opacity": 0.95,
                        },
                    });
                }
            } else if (map.getSource(SRC)) {
                if (map.getLayer(LINE)) map.removeLayer(LINE);
                if (map.getLayer(CASING)) map.removeLayer(CASING);
                if (map.getLayer(GLOW)) map.removeLayer(GLOW);
                map.removeSource(SRC);
            }
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route, mapReady, accentColor, userLocation?.lng, userLocation?.lat]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady) return;

        if (!navStarted) {
            // Not navigating: show overview or current location
            if (route?.geometry && destination && userLocation) {
                const coords = route.geometry.coordinates;
                const lngs = coords.map((c) => c[0]);
                const lats = coords.map((c) => c[1]);

                map.fitBounds(
                    [
                        [Math.min(...lngs), Math.min(...lats)],
                        [Math.max(...lngs), Math.max(...lats)],
                    ],
                    {
                        padding: {
                            top: 90,
                            bottom: 330,
                            left: 60,
                            right: 60,
                        },
                        pitch: mapViewMode === "3d" ? 60 : 0,
                        bearing: 0,
                        duration: 700,
                        maxZoom: 16,
                    }
                );
            } else if (userLocation) {
                map.easeTo({
                    center: [userLocation.lng, userLocation.lat],
                    zoom: 14,
                    pitch: mapViewMode === "3d" ? 60 : 0,
                    bearing: 0,
                    duration: 600,
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navStarted, route, mapReady, !!userLocation, mapViewMode]); // Omit full userLocation to avoid jumping bounds continuously

    // Continuous tracking loop during navigation
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !mapReady || !navStarted || !trackingMode || !userLocation) return;
        
        const targetZoom = travelMode === "driving" ? 16 : 18.5;
        
        map.easeTo({
            center: [userLocation.lng, userLocation.lat],
            bearing: deviceHeading,
            zoom: targetZoom,
            pitch: navViewMode === "3d" ? 60 : 0,
            padding: { top: 0, bottom: 250, left: 0, right: 0 },
            duration: 1000,
            easing: (t) => t // linear easing for smooth continuous tracking
        });
    }, [userLocation, deviceHeading, navStarted, trackingMode, mapReady, travelMode, navViewMode]);

    const { distance, duration } =
        useMemo(() => {
            if (!route) {
                return {
                    distance: null,
                    duration: null,
                };
            }

            const last =
                lastFetchRef.current;

            if (
                !last ||
                !userLocation
            ) {
                return {
                    distance:
                        route.distance,
                    duration:
                        route.duration,
                };
            }

            const moved =
                haversineMeters(
                    userLocation,
                    {
                        lat: last.fromLat,
                        lng: last.fromLng,
                    }
                );

            const remainingDist =
                Math.max(
                    0,
                    route.distance -
                    moved
                );

            const pace =
                route.distance > 0
                    ? route.duration /
                    route.distance
                    : 0;

            let remainingDur =
                pace > 0
                    ? remainingDist *
                    pace
                    : route.duration;

            if (
                !Number.isFinite(
                    remainingDur
                ) ||
                remainingDur < 0
            ) {
                remainingDur =
                    etaSecondsFromDistance(
                        remainingDist,
                        travelMode,
                        userLocation.speed ??
                        0
                    );
            }

            return {
                distance:
                    remainingDist,
                duration:
                    remainingDur,
            };
        }, [
            route,
            userLocation,
            travelMode,
        ]);

    const nextStep = useMemo(() => {
        if (!route?.steps?.length) {
            return null;
        }

        return (
            route.steps[
            currentStepIdx
            ] ?? null
        );
    }, [route, currentStepIdx]);

    const handleEnd = useCallback(() => {
        haptics.tap();
        update({ navStarted: false });
    }, [update]);

    const handleCancel =
        useCallback(() => {
            haptics.tap();

            update({
                navStarted: false,
            });

            onEnd?.();
        }, [update, onEnd]);

    const handleRecenter = useCallback(() => {
        const map = mapRef.current;
        if (!map || !mapReady || !userLocation) return;
        
        haptics.tap();
        setTrackingMode(true);
        
        const targetZoom = travelMode === "driving" ? 16 : 18.5;
        map.easeTo({
            center: [userLocation.lng, userLocation.lat],
            zoom: targetZoom,
            pitch: navViewMode === "3d" ? 60 : 0,
            bearing: deviceHeading,
            padding: { top: 0, bottom: 250, left: 0, right: 0 },
            duration: 500,
        });
    }, [userLocation, mapReady, deviceHeading, travelMode, navViewMode]);

    if (!tokenAvailable) {
        return (
            <div className="flex h-dvh items-center justify-center bg-black text-white">
                Missing Mapbox token
            </div>
        );
    }

    return (
        <div className="relative h-[100dvh] w-full overflow-hidden">
            <div
                ref={containerRef}
                className="absolute inset-0 h-full w-full"
                style={{ 
                    background: "#08080A",
                    transform: "translate3d(0,0,0)",
                    isolation: "isolate",
                }}
            />

            {!navStarted && (
                <div className="absolute left-0 right-0 top-0 z-20 flex justify-center pt-4">
                    <DestinationPill
                        category={selectedCategory}
                        destination={destination}
                        distance={distance}
                        units={units}
                        anchor="top"
                    />
                </div>
            )}

            <AnimatePresence>
                {navStarted &&
                    nextStep && (
                        <motion.div
                            key="ttb"
                            initial={{
                                opacity: 0,
                                y: -16,
                            }}
                            animate={{
                                opacity: 1,
                                y: 0,
                            }}
                            exit={{
                                opacity: 0,
                                y: -16,
                            }}
                            className="absolute left-4 right-4 z-30 rounded-2xl bg-black/65 border border-white/10 p-4 backdrop-blur-xl shadow-2xl"
                            style={{
                                top: "calc(env(safe-area-inset-top, 0px) + 16px)",
                            }}
                        >
                            <div className="flex gap-3 items-center">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300">
                                    <Navigation2
                                        size={16}
                                        style={{ transform: "rotate(45deg)" }}
                                    />
                                </div>

                                <div>
                                    <div className="text-xs font-semibold text-white leading-tight">
                                        {nextStep
                                            .maneuver
                                            ?.instruction ??
                                            "Continue"}
                                    </div>

                                    <div className="mt-0.5 text-[10px] text-white/60">
                                        {formatDistance(
                                            nextStep.distance,
                                            units
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
                    bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 28 }}
                    className="rounded-[22px] p-4 tg-glass-strong"
                    data-testid="map-info-card"
                >
                    <div className="flex items-baseline justify-between">
                        <div>
                            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/40">
                                {selectedCategory?.label || ""}
                            </div>
                            <div
                                data-testid="map-route-distance"
                                className="mt-0.5 text-xl font-black tracking-tight text-white"
                            >
                                {routeLoading
                                    ? "Calculating…"
                                    : routeError
                                        ? "Route unavailable"
                                        : formatDistance(distance, units)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/40">
                                ETA
                            </div>
                            <div
                                data-testid="map-route-eta"
                                className="mt-0.5 text-xl font-black tracking-tight text-white"
                            >
                                {formatDuration(duration)}
                            </div>
                        </div>
                    </div>

                    {!navStarted && (
                        <div className="mt-3 flex gap-1.5 rounded-xl bg-white/[0.04] p-1">
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
                                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${active
                                                ? "bg-white/10 text-white ring-1 ring-white/10"
                                                : "text-white/45"
                                            }`}
                                    >
                                        <Icon size={12} strokeWidth={1.8} />
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-3 flex gap-2.5">
                        {!navStarted ? (
                            <button
                                data-testid="start-navigation"
                                disabled={!route || routeLoading}
                                onClick={() => {
                                    haptics.success();
                                    update({ navStarted: true });
                                }}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-500/90 px-4 py-2.5 text-[13px] font-bold text-black active:scale-[0.98] disabled:opacity-40"
                            >
                                <Play size={12} strokeWidth={2.4} />
                                Start
                            </button>
                        ) : (
                            <button
                                data-testid="end-navigation"
                                onClick={handleEnd}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-[13px] font-bold text-white ring-1 ring-white/10 active:scale-[0.98]"
                            >
                                <Square size={10} strokeWidth={2.4} />
                                End
                            </button>
                        )}
                        {navStarted && (
                            <button
                                data-testid="map-recenter"
                                onClick={handleRecenter}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 active:scale-95"
                                aria-label="Recenter"
                            >
                                <LocateFixed size={14} strokeWidth={2} />
                            </button>
                        )}
                        <button
                            data-testid="map-cancel"
                            onClick={handleCancel}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/55 ring-1 ring-white/10 active:scale-95"
                            aria-label="Cancel"
                        >
                            <X size={12} strokeWidth={1.8} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}