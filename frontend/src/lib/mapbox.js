// Thin wrapper around the Mapbox APIs we use. Reads the token from a single
// place — never accessed ad-hoc elsewhere in the app.

const TOKEN = process.env.REACT_APP_MAPBOX_API_KEY || "";

export const hasMapboxToken = () => Boolean(TOKEN && TOKEN.length > 20);
export const getMapboxToken = () => TOKEN;

const SEARCH_BASE = "https://api.mapbox.com/search/searchbox/v1";
const DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox";

// Resolve the nearest real POI for a given canonical category id, near a real
// coordinate. Returns the closest result or null.
export async function findNearestPOI({
    category,
    alternatives = [],
    lng,
    lat,
    limit = 8,
    signal,
}) {
    if (!hasMapboxToken()) throw new Error("Mapbox token missing");
    if (!category) return null;
    const candidates = [category, ...alternatives];

    for (const canonical of candidates) {
        const url = new URL(`${SEARCH_BASE}/category/${canonical}`);
        url.searchParams.set("access_token", TOKEN);
        url.searchParams.set("proximity", `${lng},${lat}`);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("language", "en");

        let res;
        try {
            res = await fetch(url.toString(), { signal });
        } catch (e) {
            if (e && e.name === "AbortError") throw e;
            continue;
        }
        if (!res.ok) continue;
        const data = await res.json();
        const features = (data && data.features) || [];
        if (!features.length) continue;
        // Closest by straight-line distance for selection (route follows).
        const enriched = features
            .filter((f) => f && f.geometry && f.geometry.coordinates)
            .map((f) => {
                const [flng, flat] = f.geometry.coordinates;
                const dx = (flng - lng) * 111000 * Math.cos((lat * Math.PI) / 180);
                const dy = (flat - lat) * 111000;
                return { f, sq: dx * dx + dy * dy };
            })
            .sort((a, b) => a.sq - b.sq);
        if (!enriched.length) continue;
        const top = enriched[0].f;
        const [flng, flat] = top.geometry.coordinates;
        const props = top.properties || {};
        return {
            name: props.name || props.name_preferred || "Unknown place",
            address:
                props.address ||
                (props.context && props.context.address && props.context.address.name) ||
                props.full_address ||
                props.place_formatted ||
                "",
            lng: flng,
            lat: flat,
            mapboxId: props.mapbox_id || top.id,
            canonical,
            raw: top,
        };
    }
    return null;
}

// Get a real driving/walking/cycling route from Mapbox Directions.
export async function fetchRoute({
    from,
    to,
    profile = "walking",
    signal,
}) {
    if (!hasMapboxToken()) throw new Error("Mapbox token missing");

    // Map internal travel mode key to Mapbox Directions v5 profile ID
    let mapboxProfile = profile;
    if (profile === "driving") {
        mapboxProfile = "driving-traffic";
    }

    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = new URL(`${DIRECTIONS_BASE}/${mapboxProfile}/${coords}`);
    url.searchParams.set("access_token", TOKEN);
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("steps", "true");
    url.searchParams.set("overview", "full");
    url.searchParams.set("language", "en");
    url.searchParams.set("annotations", "duration,distance");

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error(`Directions failed: ${res.status}`);
    const data = await res.json();
    const route = data.routes && data.routes[0];
    if (!route) return null;
    return {
        distance: route.distance, // meters
        duration: route.duration, // seconds
        geometry: route.geometry, // GeoJSON LineString
        steps:
            (route.legs && route.legs[0] && route.legs[0].steps) || [],
        profile,
    };
}
