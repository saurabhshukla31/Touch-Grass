// Real Mapbox Search Box API canonical category IDs.
// Reference: https://docs.mapbox.com/api/search/search-box/#category-search
// We pass these to /search/searchbox/v1/category/{canonical_id}.

export const CATEGORIES = [
    {
        key: "grass",
        label: "Grass",
        searchCanonical: "park",
        // Fallback alternatives if the primary returns no results in the area.
        searchAlternatives: ["nature_preserve", "garden", "sports_field"],
        accent: "#10B981",
        accentSoft: "rgba(16, 185, 129, 0.18)",
        iconKey: "grass",
        hero: true,
    },
    {
        key: "cafe",
        label: "Café",
        searchCanonical: "coffee_shop",
        searchAlternatives: ["cafe", "coffee"],
        accent: "#D6B98C",
        accentSoft: "rgba(214, 185, 140, 0.14)",
        iconKey: "coffee",
    },
    {
        key: "petrol",
        label: "Petrol",
        searchCanonical: "gas_station",
        searchAlternatives: ["fuel"],
        accent: "#F5C26B",
        accentSoft: "rgba(245, 194, 107, 0.12)",
        iconKey: "fuel",
    },
    {
        key: "hospital",
        label: "Hospital",
        searchCanonical: "hospital",
        searchAlternatives: ["clinic", "medical_care"],
        accent: "#F87171",
        accentSoft: "rgba(248, 113, 113, 0.12)",
        iconKey: "hospital",
    },
    {
        key: "restaurant",
        label: "Restaurant",
        searchCanonical: "restaurant",
        searchAlternatives: ["food"],
        accent: "#FCA5A5",
        accentSoft: "rgba(252, 165, 165, 0.12)",
        iconKey: "utensils",
    },
    {
        key: "pharmacy",
        label: "Pharmacy",
        searchCanonical: "pharmacy",
        searchAlternatives: ["drugstore"],
        accent: "#86EFAC",
        accentSoft: "rgba(134, 239, 172, 0.12)",
        iconKey: "pill",
    },
    {
        key: "atm",
        label: "ATM",
        searchCanonical: "atm",
        searchAlternatives: ["bank"],
        accent: "#A5B4FC",
        accentSoft: "rgba(165, 180, 252, 0.12)",
        iconKey: "landmark",
    },
    {
        key: "gym",
        label: "Gym",
        searchCanonical: "gym",
        searchAlternatives: ["fitness_center"],
        accent: "#FDA4AF",
        accentSoft: "rgba(253, 164, 175, 0.12)",
        iconKey: "dumbbell",
    },
    {
        key: "bar",
        label: "Bar",
        searchCanonical: "bar",
        searchAlternatives: ["pub", "nightclub"],
        accent: "#C4B5FD",
        accentSoft: "rgba(196, 181, 253, 0.12)",
        iconKey: "wine",
    },
    {
        key: "random",
        label: "Random",
        searchCanonical: null,
        searchAlternatives: [],
        accent: "rgba(255,255,255,0.6)",
        accentSoft: "rgba(255,255,255,0.06)",
        iconKey: "shuffle",
    },
];

export const getCategoryByKey = (key) =>
    CATEGORIES.find((c) => c.key === key) || null;

// The pool from which Random picks (everything except Random itself).
export const RANDOM_POOL = CATEGORIES.filter((c) => c.key !== "random");
