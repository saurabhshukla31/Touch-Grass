import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";


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
    Search,
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

export default function MapView({ onEnd, tracker, plannedDistanceRef }) {
    const {
        userLocation,
        destination,
        selectedCategory,
        travelMode,
        setTravelMode,
        navStarted,
        update,
        units,
        subscribeHeading,
        mapViewMode,
        navViewMode,
        theme,
    } = useApp();

    const containerRef = useRef(null);
    const mapRef = useRef(null);

    const userMarkerRef = useRef(null);
    const destMarkerRef = useRef(null);

    const lastFetchRef = useRef(null);
    const abortControllerRef = useRef(null);

    const [route, setRoute] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState(null);
    const [mapReady, setMapReady] = useState(false);
    const [trackingMode, setTrackingMode] = useState(true);

    const [currentStepIdx, setCurrentStepIdx] = useState(0);

    const tokenAvailable = hasMapboxToken();

    const userLocationRef = useRef(userLocation);
    const mapReadyRef = useRef(mapReady);
    const navStartedRef = useRef(navStarted);
    const trackingModeRef = useRef(trackingMode);
    const travelModeRef = useRef(travelMode);
    const navViewModeRef = useRef(navViewMode);

    const latestHeadingRef = useRef(0);
    const lastCameraUpdateRef = useRef(0);
    const cameraThrottlerRef = useRef(null);

    useEffect(() => {
        userLocationRef.current = userLocation;
    }, [userLocation]);

    useEffect(() => {
        mapReadyRef.current = mapReady;
    }, [mapReady]);

    useEffect(() => {
        navStartedRef.current = navStarted;
    }, [navStarted]);

    useEffect(() => {
        trackingModeRef.current = trackingMode;
    }, [trackingMode]);

    useEffect(() => {
        travelModeRef.current = travelMode;
    }, [travelMode]);

    useEffect(() => {
        navViewModeRef.current = navViewMode;
    }, [navViewMode]);

    const syncMapCamera = useCallback((force = false) => {
        const map = mapRef.current;
        if (!map || !mapReadyRef.current || !navStartedRef.current || !trackingModeRef.current) return;

        const now = performance.now();
        const elapsed = now - lastCameraUpdateRef.current;

        const performUpdate = () => {
            const loc = userLocationRef.current;
            const headingVal = latestHeadingRef.current;
            if (!loc) return;

            const targetZoom = travelModeRef.current === "cycling" ? 17.5 : (travelModeRef.current === "driving" ? 16 : 18.5);

            map.easeTo({
                center: [loc.lng, loc.lat],
                bearing: headingVal,
                zoom: targetZoom,
                pitch: navViewModeRef.current === "3d" ? 60 : 0,
                padding: { top: 0, bottom: 250, left: 0, right: 0 },
                duration: 200,
                easing: (t) => t
            });

            lastCameraUpdateRef.current = performance.now();
            cameraThrottlerRef.current = null;
        };

        if (force || elapsed >= 200) {
            if (cameraThrottlerRef.current) {
                clearTimeout(cameraThrottlerRef.current);
                cameraThrottlerRef.current = null;
            }
            performUpdate();
        } else {
            if (!cameraThrottlerRef.current) {
                cameraThrottlerRef.current = setTimeout(performUpdate, 200 - elapsed);
            }
        }
    }, []);

    useEffect(() => {
        return () => {
            if (cameraThrottlerRef.current) {
                clearTimeout(cameraThrottlerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeHeading((h) => {
            let currentDeviceHeading = h;
            const uLoc = userLocationRef.current;
            if (
                uLoc &&
                uLoc.speed !== null &&
                uLoc.speed > 0.8 &&
                uLoc.heading !== null
            ) {
                currentDeviceHeading = uLoc.heading;
            }

            latestHeadingRef.current = currentDeviceHeading;

            if (userMarkerRef.current) {
                const wrap = userMarkerRef.current.getElement();
                const beam = wrap.querySelector(".tg-heading-beam");
                if (beam) {
                    beam.style.transform = `rotate(${currentDeviceHeading}deg)`;
                    beam.style.opacity = "1";
                }
            }

            syncMapCamera(false);
        });

        return unsubscribe;
    }, [subscribeHeading, syncMapCamera]);

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
        let t1;
        let t2;
        const handleResize = () => {
            try {
                mapInstance?.resize();
            } catch { }
        };

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
                style: theme === "light" ? "mapbox://styles/mapbox/light-v11" : MAP_STYLE,
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

                    const isLight = theme === "light";

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
                                    isLight ? "#e5e7eb" : "#4D4E58"
                                );
                            } catch { }
                        }

                        if (l.type === "symbol") {
                            try {
                                mapInstance.setPaintProperty(
                                    l.id,
                                    "text-color",
                                    isLight ? "rgba(15,23,42,0.8)" : "rgba(255,255,255,0.62)"
                                );

                                mapInstance.setPaintProperty(
                                    l.id,
                                    "text-halo-color",
                                    isLight ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)"
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
                                "fill-extrusion-color": isLight ? "#e2e8f0" : "#111218",
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

                t1 = setTimeout(() => {
                    mapInstance?.resize();
                }, 500);

                t2 = setTimeout(() => {
                    mapInstance?.resize();
                }, 1200);

                window.addEventListener("resize", handleResize);
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
            if (t1) clearTimeout(t1);
            if (t2) clearTimeout(t2);
            window.removeEventListener("resize", handleResize);

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
    }, [tokenAvailable, theme]);

    useEffect(() => {
        const map = mapRef.current;

        if (!map || !mapReady) return;

        if (!userLocation) {
            userMarkerRef.current?.remove();
            userMarkerRef.current = null;
            return;
        }

        const beamHeading = latestHeadingRef.current;
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

            const dotRingBorderColor = theme === "light" ? "#a0a0a8" : "#08080A";
            const dotRing = document.createElement("div");
            dotRing.style.cssText = `width:20px;height:20px;border-radius:50%;background:${theme === "light" ? "#b8b8c0" : "#ffffff"};box-shadow:0 3px 8px rgba(0,0,0,0.25);border:2px solid ${dotRingBorderColor};display:flex;align-items:center;justify-content:center;z-index:2;`;
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

            const dotRing = wrap.querySelector("[data-testid='user-marker']");
            if (dotRing) {
                dotRing.style.borderColor = theme === "light" ? "#a0a0a8" : "#08080A";
                dotRing.style.background = theme === "light" ? "#b8b8c0" : "#ffffff";
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userLocation, mapReady, accentColor, theme]);

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

            const destBg = theme === "light" ? "rgba(220,220,225,0.95)" : "rgba(20,20,24,0.85)";
            const destBoxShadow = theme === "light"
                ? `0 8px 24px rgba(0,0,0,0.12), 0 0 0 4px ${accentColor}1A`
                : `0 8px 24px rgba(0,0,0,0.5), 0 0 0 4px ${accentColor}15`;

            el.style.cssText =
                `position:relative;width:34px;height:34px;border-radius:14px;` +
                `background:${destBg};border:1px solid ${accentColor};` +
                `display:flex;align-items:center;justify-content:center;` +
                `backdrop-filter:blur(20px);` +
                `box-shadow:${destBoxShadow};`;

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
    }, [destination, mapReady, accentColor, theme]);

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
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
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

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const ac = new AbortController();
        abortControllerRef.current = ac;

        fetchRoute({
            from: userLocation,
            to: destination,
            profile: travelMode,
            signal: ac.signal,
        })
            .then((r) => {
                if (ac.signal.aborted) return;
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

                // Capture planned distance for session saving
                if (plannedDistanceRef && r.distance != null) {
                    plannedDistanceRef.current = r.distance; // meters
                }

                lastFetchRef.current = {
                    fromLat: userLocation.lat,
                    fromLng: userLocation.lng,
                    destLat: destination.lat,
                    destLng: destination.lng,
                    profile: travelMode,
                };
                if (abortControllerRef.current === ac) {
                    abortControllerRef.current = null;
                }
            })
            .catch((e) => {
                if (ac.signal.aborted || e?.name === "AbortError") {
                    return;
                }

                if (firstFetch) {
                    setRouteError(
                        e.message ??
                        "Route error"
                    );
                }
                if (abortControllerRef.current === ac) {
                    abortControllerRef.current = null;
                }
            })
            .finally(() => {
                if (firstFetch) {
                    setRouteLoading(false);
                }
            });
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
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

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

        // ── Draw actual traveled path from GPS tracker ──
        const TSRC = "tg-traveled";
        const TLINE = "tg-traveled-line";
        try {
            const pts = tracker?.routePoints;
            if (pts && pts.length >= 2) {
                const data = {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "LineString",
                        coordinates: pts.map((p) => [p.lng, p.lat]),
                    },
                };
                if (map.getSource(TSRC)) {
                    map.getSource(TSRC).setData(data);
                } else {
                    map.addSource(TSRC, { type: "geojson", data });
                    map.addLayer({
                        id: TLINE,
                        type: "line",
                        source: TSRC,
                        layout: { "line-cap": "round", "line-join": "round" },
                        paint: {
                            "line-color": "#60a5fa",
                            "line-width": 3,
                            "line-opacity": 0.7,
                            "line-dasharray": [2, 2],
                        },
                    });
                }
            } else if (map.getSource(TSRC)) {
                if (map.getLayer(TLINE)) map.removeLayer(TLINE);
                map.removeSource(TSRC);
            }
        } catch { }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route, mapReady, accentColor, userLocation?.lng, userLocation?.lat, tracker?.routePoints]);

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

    // Trigger Mapbox camera synchronization when GPS location changes
    useEffect(() => {
        if (userLocation) {
            syncMapCamera(true); // force update positioning on GPS updates
        }
    }, [userLocation, syncMapCamera]);

    useEffect(() => {
        syncMapCamera(true);
    }, [mapReady, navStarted, trackingMode, travelMode, navViewMode, syncMapCamera]);

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
        const paddingBottom = destination ? 250 : 100;
        map.easeTo({
            center: [userLocation.lng, userLocation.lat],
            zoom: targetZoom,
            pitch: navViewMode === "3d" ? 60 : 0,
            bearing: latestHeadingRef.current,
            padding: { top: 0, bottom: paddingBottom, left: 0, right: 0 },
            duration: 500,
        });
    }, [userLocation, mapReady, travelMode, navViewMode, destination]);

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
                <div
                    className="absolute left-4 right-4 z-30"
                    style={{
                        top: "calc(env(safe-area-inset-top, 0px) + 16px)",
                    }}
                >
                    <div className="tg-map-glass flex h-12 w-full items-center gap-3 rounded-full px-4">
                        <Search
                            size={18}
                            className="text-white/40 shrink-0"
                            strokeWidth={2}
                        />
                        <input
                            type="text"
                            readOnly
                            value={destination ? destination.name : ""}
                            placeholder="Search here..."
                            className="flex-1 bg-transparent text-sm font-semibold focus:outline-none text-white placeholder:font-medium placeholder:text-white/30"
                        />
                    </div>
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
                            className="tg-map-glass absolute left-4 right-4 z-30 rounded-2xl p-4"
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
                                    <div className="text-xs font-semibold leading-tight text-white">
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

            {/* Bottom info card / Instruction / Recenter */}
            {!destination ? (
                <>
                    {/* Floating Recenter Button */}
                    <div
                        className="absolute z-30"
                        style={{
                            right: "16px",
                            bottom: "calc(env(safe-area-inset-bottom, 0px) + 224px)",
                        }}
                    >
                        <button
                            data-testid="map-recenter"
                            onClick={handleRecenter}
                            className="tg-map-glass flex h-12 w-12 items-center justify-center rounded-full text-white active:scale-95 transition-transform"
                            aria-label="Recenter"
                        >
                            <LocateFixed size={18} strokeWidth={2} />
                        </button>
                    </div>

                    {/* Bottom Guide Text */}
                    <div
                        className="absolute inset-x-4 z-30 flex justify-center"
                        style={{
                            bottom: "calc(env(safe-area-inset-bottom, 0px) + 98px)",
                        }}
                    >
                        <div className="tg-map-glass w-full max-w-sm p-5 rounded-3xl text-center">
                            <h3 className="text-base font-black tracking-tight leading-snug text-white">
                                Go to the <span className="text-emerald-500 font-black">Home Tab</span>
                            </h3>
                            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-white/55">
                                Choose a category to get started and begin tracking.
                            </p>
                        </div>
                    </div>
                </>
            ) : (
                /* Bottom info card */
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
                        className="rounded-[22px] p-4 tg-map-glass-strong"
                        data-testid="map-info-card"
                    >

                        <div className="flex items-baseline justify-between">
                            <div>
                                <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/40">
                                    Distance
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

                        {/* ── Live tracking stats (visible during navigation) ── */}
                        {navStarted && tracker && (
                            <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                                <div className="flex-1">
                                    <div className="text-[8px] font-semibold uppercase tracking-[0.22em] text-blue-400/70">
                                        Travelled
                                    </div>
                                    <div className="text-sm font-black tracking-tight text-white">
                                        {(tracker.actualDistanceKm).toFixed(2)} km
                                    </div>
                                </div>
                                <div className="h-6 w-px bg-white/10" />
                                <div className="flex-1">
                                    <div className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/40">
                                        Planned Route
                                    </div>
                                    <div className="text-sm font-bold tracking-tight text-white/60">
                                        {route ? formatDistance(route.distance, units) : "—"}
                                    </div>
                                </div>
                                <div className="h-6 w-px bg-white/10" />
                                <div>
                                    <div className="text-[8px] font-semibold uppercase tracking-[0.22em] text-white/40">
                                        Time
                                    </div>
                                    <div className="text-sm font-bold tracking-tight text-white/60">
                                        {formatDuration(tracker.durationSec)}
                                    </div>
                                </div>
                            </div>
                        )}

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
                                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-rose-500/10 px-4 py-2.5 text-[13px] font-bold text-rose-400 ring-1 ring-rose-500/20 active:scale-[0.98] transition-colors hover:bg-rose-500/15"
                                >
                                    <Square size={12} strokeWidth={2} fill="currentColor" />
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
            )}
        </div>
    );
}