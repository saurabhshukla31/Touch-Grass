// Thin wrapper around the Mapbox APIs we use. Reads the token from a single
// place — never accessed ad-hoc elsewhere in the app.
import { CATEGORIES } from "./categories";

if (typeof window !== "undefined" && !window.process) {
    window.process = { env: {} };
}

const TOKEN = process.env.REACT_APP_MAPBOX_API_KEY || "";

export const hasMapboxToken = () => Boolean(TOKEN && TOKEN.length > 20);
export const getMapboxToken = () => TOKEN;

const SEARCH_BASE = "https://api.mapbox.com/search/searchbox/v1";
const DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox";

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateIntentConfidence(feature, categoryKey) {
    if (!feature) return { score: 0.9, warning: null };
    const props = feature.properties || {};
    const name = (props.name || props.name_preferred || feature.text || "").toLowerCase();
    const address = (
        props.address ||
        (props.context && props.context.address && props.context.address.name) ||
        props.full_address ||
        props.place_formatted ||
        feature.place_name ||
        ""
    ).toLowerCase();

    // Find the category config
    const category = CATEGORIES.find(c => c.key === categoryKey || c.searchCanonical === categoryKey);
    if (!category) return { score: 0.9, warning: null }; // Default high confidence if unknown category

    const semantic = category.semanticKeywords || [];
    const excludes = category.excludeKeywords || [];

    // 1. Strict Exclusions Check (User trust first)
    const hasExclude = excludes.some(kw => {
        const lowerKw = kw.toLowerCase();
        return name.includes(lowerKw) || address.includes(lowerKw);
    });
    if (hasExclude) {
        return { score: 0.05, warning: "Excluded by intent rules", excluded: true };
    }

    let score = 0.5; // Start baseline
    let keywordMatches = 0;

    // 2. Evaluate Semantic Keyword Positives
    semantic.forEach(kw => {
        const lowerKw = kw.toLowerCase();
        if (name.includes(lowerKw)) {
            score += 0.25;
            keywordMatches++;
        } else if (address.includes(lowerKw)) {
            score += 0.1;
            keywordMatches++;
        }
    });

    // 3. Category ID checks (verifying primary tags in Mapbox)
    const featureCategories = (props.categories || props.poi_category_ids || []).map(c => c.toLowerCase());
    const primaryCategory = (props.poi_category || "").toLowerCase();

    if (category.searchCanonical && (primaryCategory.includes(category.searchCanonical) || featureCategories.includes(category.searchCanonical))) {
        score += 0.15;
    }

    // If the category is highly specific (like gaming_cafe or karaoke or turf) and there is absolutely ZERO keyword matching in the name, heavily penalize it!
    if (["gaming_cafe", "karaoke", "turf"].includes(category.key) && keywordMatches === 0) {
        score -= 0.45;
    }

    score = Math.max(0.0, Math.min(1.0, +score.toFixed(2)));

    let warning = null;
    let excluded = score < 0.35;
    if (score < 0.35) {
        warning = "Low confidence: intent mismatch";
    } else if (score < 0.65) {
        warning = "Partial match confidence";
    }

    return { score, warning, excluded };
}

function processFeatures(features, lng, lat, excludeKeywords = [], categoryKey = null) {
    if (!features || !features.length) return null;

    try {
        const safeExcludeKeywords = Array.isArray(excludeKeywords) ? excludeKeywords : [];
        
        const enriched = features
            .filter((f) => f && f.geometry && f.geometry.coordinates)
            .map((f) => {
                const props = f.properties || {};
                const name = (props.name || props.name_preferred || f.text || "").toLowerCase();
                const address = (
                    props.address ||
                    (props.context && props.context.address && props.context.address.name) ||
                    props.full_address ||
                    props.place_formatted ||
                    f.place_name ||
                    ""
                ).toLowerCase();

                const hasExclude = safeExcludeKeywords.some((keyword) => {
                    const kw = keyword.toLowerCase();
                    return name.includes(kw) || address.includes(kw);
                });

                const evalResult = calculateIntentConfidence(f, categoryKey);

                const [flng, flat] = f.geometry.coordinates;
                const distance = calculateDistance(lat, lng, flat, flng);

                return {
                    f,
                    distance,
                    confidence: hasExclude || evalResult.excluded ? 0.05 : evalResult.score,
                    warning: evalResult.warning,
                };
            })
            .filter((item) => item.confidence >= 0.35)
            .sort((a, b) => {
                if (b.confidence !== a.confidence) {
                    return b.confidence - a.confidence;
                }
                return a.distance - b.distance;
            });

        if (!enriched.length) return null;
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
                props.place_name ||
                "",
            lng: flng,
            lat: flat,
            mapboxId: props.mapbox_id || top.id,
            confidenceScore: enriched[0].confidence,
            matchWarning: enriched[0].warning,
            raw: top,
        };
    } catch (err) {
        console.error("[Mapbox] Safe fallback activated! Error in processFeatures:", err);
        const validFeatures = features.filter((f) => f && f.geometry && f.geometry.coordinates);
        if (validFeatures.length > 0) {
            const top = validFeatures[0];
            const [flng, flat] = top.geometry.coordinates;
            const props = top.properties || {};
            return {
                name: props.name || props.name_preferred || top.text || "Selected Place",
                address: props.address || props.full_address || props.place_formatted || top.place_name || "",
                lng: flng,
                lat: flat,
                mapboxId: props.mapbox_id || top.id,
                confidenceScore: 0.9,
                matchWarning: null,
                raw: top,
            };
        }
        return null;
    }
}

// Resolve the nearest real POI for a given canonical category id, near a real
// coordinate. Returns the closest result or null.
export async function findNearestPOI({
    category,
    alternatives = [],
    searchQuery,
    searchQueryCategory,
    excludeKeywords = [],
    lng,
    lat,
    limit = 8,
    signal,
}) {
    if (!hasMapboxToken()) throw new Error("Mapbox token missing");

    // 1. If a text query is provided, perform a targeted search filtered by category
    if (searchQuery) {
        const url = new URL(`${SEARCH_BASE}/search`);
        url.searchParams.set("q", searchQuery);
        url.searchParams.set("access_token", TOKEN);
        url.searchParams.set("proximity", `${lng},${lat}`);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("language", "en");
        if (searchQueryCategory) {
            url.searchParams.set("category", searchQueryCategory);
        }

        try {
            const res = await fetch(url.toString(), { signal });
            if (res.ok) {
                const data = await res.json();
                const features = (data && data.features) || [];
                if (features.length) {
                    const parsed = processFeatures(features, lng, lat, excludeKeywords, category);
                    if (parsed) return parsed;
                }
            }
        } catch (e) {
            if (e && e.name === "AbortError") throw e;
            console.warn("[Mapbox] Text query search failed, falling back to category search...", e);
        }
    }

    // 2. Fallback to canonical category list search
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
        let data;
        try {
            data = await res.json();
        } catch (e) {
            console.warn("[Mapbox] Failed to parse canonical search JSON response", e);
            continue;
        }

        const features = (data && data.features) || [];
        if (!features.length) continue;

        try {
            const parsed = processFeatures(features, lng, lat, excludeKeywords, category);
            if (parsed) {
                return { ...parsed, canonical };
            }
        } catch (e) {
            console.error("[Mapbox] Failed to process features inside findNearestPOI category loop:", e);
        }
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

// ─── Natural-language category mapping ────────────────────────────────────────
// Maps common English words people type into a map search bar → Mapbox POI
// categories. This lets us understand "nearest salon" or "coffee near me".
const CATEGORY_MAP = {
    // Food & Drink
    cafe: "cafe", coffee: "cafe", starbucks: "cafe",
    restaurant: "restaurant", food: "restaurant", eat: "restaurant", dining: "restaurant",
    "fast food": "fast_food", pizza: "restaurant", burger: "fast_food", sushi: "restaurant",
    bakery: "bakery", cake: "bakery", pastry: "bakery", dessert: "bakery",
    bar: "bar", pub: "bar", beer: "bar", drinks: "bar", cocktail: "bar",
    club: "nightclub", nightclub: "nightclub",

    // Health & Wellness
    salon: "beauty_salon", "beauty salon": "beauty_salon", spa: "spa",
    "hair salon": "beauty_salon", barber: "barber_shop", barbershop: "barber_shop",
    nail: "beauty_salon", nails: "beauty_salon", "nail salon": "beauty_salon",
    gym: "gym", fitness: "gym", workout: "gym",
    hospital: "hospital", clinic: "hospital", doctor: "hospital",
    pharmacy: "pharmacy", chemist: "pharmacy", drugstore: "pharmacy", medical: "hospital",
    dentist: "dentist",

    // Shopping & Services
    atm: "atm", bank: "bank", money: "atm", cash: "atm",
    market: "market", "public market": "market", "grocery store": "market", supermarket: "supermarket", grocery: "supermarket",
    store: "store", shop: "store", mall: "shopping_mall", shopping: "shopping_mall",
    "convenience store": "convenience_store", "general store": "convenience_store",
    fuel: "gas_station", gas: "gas_station", petrol: "gas_station", "gas station": "gas_station",
    "petrol pump": "gas_station", "fuel station": "gas_station",
    "ev charging": "ev_charging_station", charging: "ev_charging_station",

    // Entertainment & Leisure
    park: "park", garden: "park", playground: "park",
    movie: "cinema", cinema: "cinema", theater: "cinema", theatre: "cinema",
    museum: "museum", gallery: "art_gallery", "art gallery": "art_gallery", artwork: "art_gallery", exhibition: "art_gallery",
    forest: "nature_preserve", woods: "nature_preserve", jungle: "nature_preserve", nature: "nature_preserve",
    karaoke: "bar", "karaoke bar": "bar",
    library: "library",
    hotel: "hotel", motel: "hotel", hostel: "hotel", stay: "hotel",
    temple: "place_of_worship", church: "place_of_worship", mosque: "place_of_worship",
    "place of worship": "place_of_worship",

    // Transport
    parking: "parking", "parking lot": "parking",
    metro: "transit_station", bus: "bus_station", train: "train_station",
    airport: "airport",

    // Education
    school: "school", college: "school", university: "school",
    tuition: "school", coaching: "school",

    // Other
    laundry: "laundromat", "dry clean": "laundromat",
    "post office": "post_office",
    police: "police_station", "police station": "police_station",
    "fire station": "fire_station",
};

// Natural language filler words people use in map searches
const NL_STOP_PHRASES = [
    "nearest", "near me", "nearby", "around me", "around here",
    "closest", "close to me", "close by", "near by",
    "find me a", "find me", "find a", "find",
    "show me", "search for", "look for", "looking for",
    "where is", "where's", "where can i find",
    "i want", "i need", "i want a", "i need a",
    "best", "top", "good", "cheapest", "popular",
    "open now", "open", "24 hour", "24/7",
    "the", "a", "an", "some",
];

function parseNaturalQuery(raw) {
    let q = raw.toLowerCase().trim();

    // Strip NL filler phrases (longest first to avoid partial matches)
    const sorted = [...NL_STOP_PHRASES].sort((a, b) => b.length - a.length);
    for (const phrase of sorted) {
        q = q.replace(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi"), " ");
    }
    q = q.replace(/\s+/g, " ").trim();
    if (!q) q = raw.trim(); // fallback to original if we stripped everything

    // Try to match a category (try multi-word first, then single words)
    let matchedCategory = null;

    // Try the full cleaned query as a category key
    if (CATEGORY_MAP[q]) {
        matchedCategory = CATEGORY_MAP[q];
    }

    // Try the original raw input too (handles "fast food", "gas station", etc.)
    if (!matchedCategory) {
        const rawLower = raw.toLowerCase().trim();
        for (const phrase of sorted) {
            rawLower.replace(new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi"), " ");
        }
        // Check multi-word keys first
        const catKeys = Object.keys(CATEGORY_MAP).sort((a, b) => b.length - a.length);
        for (const key of catKeys) {
            if (q.includes(key) || raw.toLowerCase().includes(key)) {
                matchedCategory = CATEGORY_MAP[key];
                break;
            }
        }
    }

    return { cleanQuery: q, category: matchedCategory };
}

export async function getSearchSuggestions(query, proximity, signal) {
    if (!hasMapboxToken()) throw new Error("Mapbox token missing");
    if (!query || !query.trim()) return [];

    const { cleanQuery, category } = parseNaturalQuery(query);

    const lng = proximity?.lng;
    const lat = proximity?.lat;
    const hasProximity = lng != null && lat != null;

    // ─── Strategy: run both APIs in parallel ──────────────────────────────────
    const promises = [];

    // 1) SearchBox Suggest API — best for POI/category searches
    const suggestUrl = new URL(`${SEARCH_BASE}/suggest`);
    suggestUrl.searchParams.set("q", cleanQuery);
    suggestUrl.searchParams.set("access_token", TOKEN);
    suggestUrl.searchParams.set("session_token", `roamout-${Date.now()}`);
    suggestUrl.searchParams.set("language", "en");
    suggestUrl.searchParams.set("limit", "10");
    if (hasProximity) {
        suggestUrl.searchParams.set("proximity", `${lng},${lat}`);
        suggestUrl.searchParams.set("origin", `${lng},${lat}`);
    }
    if (category) {
        suggestUrl.searchParams.set("types", "poi,category");
    } else {
        suggestUrl.searchParams.set("types", "poi,address,place");
    }

    promises.push(
        fetch(suggestUrl.toString(), { signal })
            .then(r => r.ok ? r.json() : { suggestions: [] })
            .then(data => ({ source: "suggest", items: data.suggestions || [] }))
            .catch(e => {
                if (e?.name === "AbortError") throw e;
                return { source: "suggest", items: [] };
            })
    );

    // 2) Geocoding v5 API — best for specific place names and addresses
    const geocodeUrl = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cleanQuery)}.json`);
    geocodeUrl.searchParams.set("access_token", TOKEN);
    geocodeUrl.searchParams.set("language", "en");
    geocodeUrl.searchParams.set("limit", "5");
    if (hasProximity) {
        geocodeUrl.searchParams.set("proximity", `${lng},${lat}`);
    }
    geocodeUrl.searchParams.set("types", "poi,address,place,locality,neighborhood");

    promises.push(
        fetch(geocodeUrl.toString(), { signal })
            .then(r => r.ok ? r.json() : { features: [] })
            .then(data => ({ source: "geocode", items: data.features || [] }))
            .catch(e => {
                if (e?.name === "AbortError") throw e;
                return { source: "geocode", items: [] };
            })
    );

    // 3) If we found a category, also do a dedicated category search
    if (category && hasProximity) {
        const catUrl = new URL(`${SEARCH_BASE}/category/${category}`);
        catUrl.searchParams.set("access_token", TOKEN);
        catUrl.searchParams.set("proximity", `${lng},${lat}`);
        catUrl.searchParams.set("origin", `${lng},${lat}`);
        catUrl.searchParams.set("limit", "10");
        catUrl.searchParams.set("language", "en");

        promises.push(
            fetch(catUrl.toString(), { signal })
                .then(r => r.ok ? r.json() : { features: [] })
                .then(data => ({ source: "category", items: data.features || [] }))
                .catch(e => {
                    if (e?.name === "AbortError") throw e;
                    return { source: "category", items: [] };
                })
        );
    }

    const results = await Promise.all(promises);

    // ─── Normalize all results into a unified format ──────────────────────────
    const merged = [];
    const seenKeys = new Set();

    for (const { source, items } of results) {
        for (const item of items) {
            let entry = null;

            if (source === "suggest") {
                const name = item.name || item.name_preferred || "";
                const addr = item.full_address || item.place_formatted || item.address || "";
                const mid = item.mapbox_id || "";
                if (!name || !mid) continue;

                let dist = item.distance ?? 999999;

                entry = {
                    mapbox_id: mid,
                    name,
                    place_formatted: addr,
                    distance: dist,
                    distanceText: "",
                    needsRetrieve: true,
                    raw: item,
                };
            } else {
                if (!item?.geometry?.coordinates) continue;
                const [fLng, fLat] = item.geometry.coordinates;
                const props = item.properties || {};

                const name = props.name || props.name_preferred || item.text ||
                    (item.place_name ? item.place_name.split(",")[0] : "");
                if (!name) continue;

                const addr = props.full_address || props.place_formatted ||
                    props.address || item.place_name || "";
                const mid = props.mapbox_id || item.id || `${fLng},${fLat}`;

                let dist = 999999;
                if (hasProximity) {
                    dist = calculateDistance(lat, lng, fLat, fLng);
                }

                entry = {
                    mapbox_id: mid,
                    name,
                    place_formatted: addr,
                    lng: fLng,
                    lat: fLat,
                    distance: dist,
                    distanceText: "",
                    needsRetrieve: false,
                    raw: item,
                };
            }

            if (!entry) continue;

            const evalResult = calculateIntentConfidence(item, category);
            if (evalResult.excluded) continue; // Exclude low confidence suggestions entirely
            entry.confidence = evalResult.score;
            entry.matchWarning = evalResult.warning;

            const dedup = `${entry.name.toLowerCase().replace(/\s+/g, "")}`;
            if (seenKeys.has(dedup)) continue;
            seenKeys.add(dedup);

            if (entry.distance < 999999) {
                entry.distanceText = entry.distance < 1000
                    ? `${Math.round(entry.distance)}m`
                    : `${(entry.distance / 1000).toFixed(1)}km`;
            }

            merged.push(entry);
        }
    }

    // Sort: by confidence descending first, then coordinates, then distance
    merged.sort((a, b) => {
        if (b.confidence !== a.confidence) {
            return b.confidence - a.confidence;
        }
        if (!a.needsRetrieve && b.needsRetrieve) return -1;
        if (a.needsRetrieve && !b.needsRetrieve) return 1;
        return a.distance - b.distance;
    });

    return merged.slice(0, 8);
}

export async function retrieveSuggestion(suggestionOrId, signal) {
    let extraFields = {};
    let id = suggestionOrId;
    
    if (suggestionOrId && typeof suggestionOrId === "object") {
        id = suggestionOrId.mapbox_id || suggestionOrId.mapboxId || "";
        extraFields = {
            confidenceScore: suggestionOrId.confidence || suggestionOrId.confidenceScore,
            matchWarning: suggestionOrId.matchWarning || suggestionOrId.warning
        };
        
        if (suggestionOrId.lng != null) {
            return {
                name: suggestionOrId.name,
                address: suggestionOrId.place_formatted || suggestionOrId.address || "",
                lng: suggestionOrId.lng,
                lat: suggestionOrId.lat,
                mapboxId: id,
                ...extraFields,
                raw: suggestionOrId.raw
            };
        }
    }

    if (!hasMapboxToken()) throw new Error("Mapbox token missing");

    const url = new URL(`${SEARCH_BASE}/retrieve/${id}`);
    url.searchParams.set("access_token", TOKEN);
    url.searchParams.set("session_token", `roamout-session-${Date.now()}`);

    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error("Retrieve failed");
    const data = await res.json();
    const feature = data.features && data.features[0];
    if (!feature) return null;

    const [lng, lat] = feature.geometry.coordinates;
    const props = feature.properties || {};
    return {
        name: props.name || props.name_preferred || "Selected Place",
        address: props.full_address || props.place_formatted || "",
        lng,
        lat,
        mapboxId: props.mapbox_id || id,
        ...extraFields,
        raw: feature,
    };
}

