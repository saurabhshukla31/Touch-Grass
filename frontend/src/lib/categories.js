import React from "react";

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
        accent: "#22c55e",
        accentSoft: "radial-gradient(ellipse at 60% 30%, #052e1688 0%, #0a0a0a 70%)",
        iconKey: "grass",
        hero: true,
        glow: "#16a34a",
        svg: (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="8" y1="40" x2="40" y2="40" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
            <path d="M18 40 C16 32 10 28 12 18 C14 24 18 28 20 34" fill="#16a34a" opacity="0.7"/>
            <path d="M30 40 C32 32 38 28 36 18 C34 24 30 28 28 34" fill="#16a34a" opacity="0.7"/>
            <path d="M24 40 C24 30 14 22 16 10 C20 18 24 22 24 22 C24 22 28 18 32 10 C34 22 24 30 24 40Z" fill="#22c55e"/>
            <path d="M24 22 C24 22 21 17 22 12 C23 16 24 22 24 22Z" fill="#4ade80" opacity="0.6"/>
            <circle cx="30" cy="22" r="2" fill="#86efac" opacity="0.8"/>
            <circle cx="31" cy="21" r="0.7" fill="white" opacity="0.6"/>
          </svg>
        ),
    },
    {
        key: "cafe",
        label: "Café",
        searchCanonical: "coffee_shop",
        searchAlternatives: ["cafe", "coffee"],
        accent: "#f97316",
        accentSoft: "radial-gradient(ellipse at 60% 30%, #2c120788 0%, #0a0a0a 70%)",
        iconKey: "coffee",
        glow: "#ea580c",
        svg: (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 10 C16 8 18 7 18 5" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
            <path d="M24 10 C24 7 26 6 26 4" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
            <path d="M32 10 C32 8 34 7 34 5" stroke="#fb923c" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
            <path d="M10 14 L13 38 H35 L38 14 Z" fill="#7c2d12" opacity="0.6"/>
            <path d="M10 14 L13 38 H35 L38 14 Z" fill="url(#coffeeGrad)" />
            <path d="M38 18 C44 18 44 30 38 30" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <ellipse cx="24" cy="39" rx="14" ry="3" fill="#431407" opacity="0.7"/>
            <ellipse cx="24" cy="15" rx="13" ry="2.5" fill="#92400e"/>
            <ellipse cx="24" cy="15" rx="9" ry="1.5" fill="#b45309" opacity="0.8"/>
            <path d="M19 15 C21 13 27 13 29 15" stroke="#fde68a" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
            <defs>
              <linearGradient id="coffeeGrad" x1="10" y1="14" x2="38" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#c2410c" stopOpacity="0.7"/>
              </linearGradient>
            </defs>
          </svg>
        ),
    },
    {
        key: "petrol",
        label: "Petrol",
        searchCanonical: "gas_station",
        searchAlternatives: ["fuel"],
        accent: "#eab308",
        accentSoft: "radial-gradient(ellipse at 60% 30%, #1c150088 0%, #0a0a0a 70%)",
        iconKey: "fuel",
        glow: "#ca8a04",
        svg: (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="12" width="22" height="32" rx="3" fill="#78350f" opacity="0.6"/>
            <rect x="8" y="12" width="22" height="32" rx="3" fill="url(#petrolGrad)" opacity="0.9"/>
            <rect x="12" y="16" width="14" height="9" rx="2" fill="#1c1500"/>
            <rect x="13" y="17" width="12" height="7" rx="1.5" fill="#eab308" opacity="0.3"/>
            <text x="19" y="23" textAnchor="middle" fill="#fde047" fontSize="5" fontWeight="bold" fontFamily="monospace">$4.29</text>
            <rect x="12" y="30" width="14" height="10" rx="1.5" fill="#451a03" opacity="0.6"/>
            <path d="M30 18 C36 18 38 14 38 14 L40 14 L40 22 C40 26 38 28 36 28 L30 28" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <rect x="38" y="22" width="6" height="4" rx="1.5" fill="#ca8a04"/>
            <rect x="43" y="23" width="3" height="2" rx="1" fill="#a16207"/>
            <rect x="13" y="31" width="4" height="1.5" rx="0.75" fill="#eab308" opacity="0.8"/>
            <rect x="13" y="34" width="6" height="1.5" rx="0.75" fill="#eab308" opacity="0.5"/>
            <rect x="13" y="37" width="3" height="1.5" rx="0.75" fill="#eab308" opacity="0.3"/>
            <defs>
              <linearGradient id="petrolGrad" x1="8" y1="12" x2="30" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#eab308" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#854d0e" stopOpacity="0.3"/>
              </linearGradient>
            </defs>
          </svg>
        ),
    },
    {
        key: "hospital",
        label: "Hospital",
        searchCanonical: "hospital",
        searchAlternatives: ["clinic", "medical_care"],
        accent: "#ef4444",
        accentSoft: "radial-gradient(ellipse at 60% 30%, #2d0a0a88 0%, #0a0a0a 70%)",
        iconKey: "hospital",
        glow: "#dc2626",
        svg: (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="16" width="32" height="28" rx="2" fill="#450a0a" opacity="0.7"/>
            <rect x="8" y="16" width="32" height="28" rx="2" fill="url(#hospitalGrad)" opacity="0.6"/>
            <path d="M4 18 L24 6 L44 18 Z" fill="#7f1d1d" opacity="0.7"/>
            <path d="M4 18 L24 6 L44 18 Z" fill="#ef4444" opacity="0.2"/>
            <rect x="12" y="22" width="8" height="8" rx="1" fill="#fca5a5" opacity="0.2"/>
            <rect x="28" y="22" width="8" height="8" rx="1" fill="#fca5a5" opacity="0.2"/>
            <rect x="19" y="32" width="10" height="12" rx="1" fill="#1a0a0a" opacity="0.8"/>
            <rect x="19" y="32" width="10" height="12" rx="1" fill="#ef4444" opacity="0.1"/>
            <rect x="20" y="14" width="8" height="3" rx="1.5" fill="#ef4444"/>
            <rect x="22.5" y="11" width="3" height="8.5" rx="1.5" fill="#ef4444"/>
            <rect x="20" y="14" width="8" height="3" rx="1.5" fill="#fca5a5" opacity="0.4"/>
            <rect x="22.5" y="11" width="3" height="8.5" rx="1.5" fill="#fca5a5" opacity="0.4"/>
            <defs>
              <linearGradient id="hospitalGrad" x1="8" y1="16" x2="40" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.1"/>
              </linearGradient>
            </defs>
          </svg>
        ),
    },
    {
        key: "restaurant",
        label: "Restaurant",
        searchCanonical: "restaurant",
        searchAlternatives: ["food"],
        accent: "#fb923c",
        accentSoft: "radial-gradient(ellipse at 60% 30%, #2c100588 0%, #0a0a0a 70%)",
        iconKey: "utensils",
        glow: "#f97316",
        svg: (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="24" cy="34" rx="16" ry="3" fill="#431407" opacity="0.5"/>
            <circle cx="24" cy="30" r="14" fill="#431407" opacity="0.5"/>
            <circle cx="24" cy="30" r="14" fill="url(#plateGrad)" opacity="0.4"/>
            <circle cx="24" cy="30" r="11" fill="#1c0a00" opacity="0.5"/>
            <circle cx="24" cy="30" r="9" fill="#7c2d12" opacity="0.3"/>
            <path d="M18 30 C18 26 22 24 24 24 C26 24 30 26 30 30" fill="#ea580c" opacity="0.7"/>
            <line x1="10" y1="10" x2="10" y2="26" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="8" y1="10" x2="8" y2="16" stroke="#fb923c" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="10" y1="10" x2="10" y2="16" stroke="#fb923c" strokeWidth="1.4" strokeLinecap="round"/>
            <line x1="12" y1="10" x2="12" y2="16" stroke="#fb923c" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M8 16 C8 20 12 20 12 16" stroke="#fb923c" strokeWidth="1.4" fill="none"/>
            <line x1="38" y1="10" x2="38" y2="30" stroke="#fb923c" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M38 10 C40 12 40 18 38 20" fill="#fb923c" opacity="0.7"/>
            <path d="M21 20 C21 17 23 16 23 14" stroke="#fdba74" strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
            <path d="M27 20 C27 17 25 16 25 14" stroke="#fdba74" strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
            <defs>
              <radialGradient id="plateGrad" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#fb923c" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="#431407" stopOpacity="0.1"/>
              </radialGradient>
            </defs>
          </svg>
        ),
    },
    {
        key: "pharmacy",
        label: "Pharmacy",
        searchCanonical: "pharmacy",
        searchAlternatives: ["drugstore"],
        accent: "#10b981",
        accentSoft: "radial-gradient(ellipse at 60% 30%, #02291888 0%, #0a0a0a 70%)",
        iconKey: "pill",
        glow: "#059669",
        svg: (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 32 C12 38 36 38 36 32 L33 24 H15 Z" fill="#064e3b" opacity="0.7"/>
            <path d="M12 32 C12 38 36 38 36 32 L33 24 H15 Z" fill="url(#mortarGrad)"/>
            <ellipse cx="24" cy="24" rx="9" ry="3" fill="#065f46" opacity="0.8"/>
            <rect x="22" y="10" width="4" height="18" rx="2" fill="#10b981" opacity="0.9"/>
            <ellipse cx="24" cy="10" rx="3" ry="2" fill="#34d399"/>
            <rect x="20" y="28" width="8" height="2.5" rx="1.25" fill="#10b981"/>
            <rect x="22.5" y="25.5" width="3" height="7" rx="1.5" fill="#10b981"/>
            <rect x="8" y="16" width="7" height="4" rx="2" fill="#6ee7b7" opacity="0.7"/>
            <line x1="11.5" y1="16" x2="11.5" y2="20" stroke="#10b981" strokeWidth="1"/>
            <rect x="33" y="14" width="7" height="4" rx="2" fill="#34d399" opacity="0.6" transform="rotate(-20 36 16)"/>
            <line x1="36.5" y1="13" x2="35.5" y2="19" stroke="#10b981" strokeWidth="1" transform="rotate(-20 36 16)"/>
            <defs>
              <linearGradient id="mortarGrad" x1="12" y1="24" x2="36" y2="38" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="#064e3b" stopOpacity="0.3"/>
              </linearGradient>
            </defs>
          </svg>
        ),
    },
    {
        key: "atm",
        label: "ATM",
        searchCanonical: "atm",
        searchAlternatives: ["bank"],
        accent: "#3b82f6",
        accentSoft: "radial-gradient(ellipse at 60% 30%, #0a162888 0%, #0a0a0a 70%)",
        iconKey: "landmark",
        glow: "#2563eb",
        svg: (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="8" width="36" height="36" rx="4" fill="#1e3a5f" opacity="0.7"/>
            <rect x="6" y="8" width="36" height="36" rx="4" fill="url(#atmGrad)" opacity="0.6"/>
            <rect x="10" y="12" width="28" height="16" rx="2" fill="#0a0a0a"/>
            <rect x="11" y="13" width="26" height="14" rx="1.5" fill="#1d4ed8" opacity="0.25"/>
            <rect x="14" y="16" width="10" height="2" rx="1" fill="#93c5fd" opacity="0.6"/>
            <rect x="14" y="20" width="16" height="1.5" rx="0.75" fill="#60a5fa" opacity="0.4"/>
            <rect x="14" y="23" width="8" height="1.5" rx="0.75" fill="#60a5fa" opacity="0.3"/>
            <rect x="10" y="30" width="18" height="3" rx="1.5" fill="#0f172a"/>
            <rect x="11" y="31" width="16" height="1" rx="0.5" fill="#3b82f6" opacity="0.4"/>
            <rect x="10" y="36" width="28" height="3" rx="1.5" fill="#0f172a"/>
            <rect x="11" y="37" width="26" height="1" rx="0.5" fill="#3b82f6" opacity="0.4"/>
            {[0,1,2].map(col => [0,1,2,3].map(row => (
              <circle key={`${col}-${row}`} cx={32 + col * 3} cy={30 + row * 3} r="0.9" fill="#60a5fa" opacity="0.6"/>
            )))}
            <rect x="14" y="35" width="10" height="5" rx="0.5" fill="#fde047" opacity="0.7"/>
            <rect x="15" y="36" width="8" height="0.5" fill="#ca8a04" opacity="0.5"/>
            <rect x="15" y="37.5" width="8" height="0.5" fill="#ca8a04" opacity="0.5"/>
            <defs>
              <linearGradient id="atmGrad" x1="6" y1="8" x2="42" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#1e40af" stopOpacity="0.1"/>
              </linearGradient>
            </defs>
          </svg>
        ),
    },
    {
        key: "gym",
        label: "Gym",
        searchCanonical: "gym",
        searchAlternatives: ["fitness_center"],
        accent: "#a855f7",
        accentSoft: "radial-gradient(ellipse at 60% 30%, #1a0a2e88 0%, #0a0a0a 70%)",
        iconKey: "dumbbell",
        glow: "#9333ea",
        svg: (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="16" width="6" height="16" rx="3" fill="#6b21a8" opacity="0.8"/>
            <rect x="2" y="16" width="6" height="16" rx="3" fill="#a855f7" opacity="0.4"/>
            <rect x="9" y="19" width="5" height="10" rx="2.5" fill="#7e22ce"/>
            <rect x="9" y="19" width="5" height="10" rx="2.5" fill="#c084fc" opacity="0.4"/>
            <rect x="14" y="22" width="20" height="4" rx="2" fill="#4c1d95"/>
            <rect x="14" y="22.5" width="20" height="2" rx="1" fill="#a855f7" opacity="0.5"/>
            <rect x="34" y="19" width="5" height="10" rx="2.5" fill="#7e22ce"/>
            <rect x="34" y="19" width="5" height="10" rx="2.5" fill="#c084fc" opacity="0.4"/>
            <rect x="40" y="16" width="6" height="16" rx="3" fill="#6b21a8" opacity="0.8"/>
            <rect x="40" y="16" width="6" height="16" rx="3" fill="#a855f7" opacity="0.4"/>
            <line x1="21" y1="23" x2="21" y2="25" stroke="#c084fc" strokeWidth="1.2" opacity="0.5"/>
            <line x1="24" y1="23" x2="24" y2="25" stroke="#c084fc" strokeWidth="1.2" opacity="0.5"/>
            <line x1="27" y1="23" x2="27" y2="25" stroke="#c084fc" strokeWidth="1.2" opacity="0.5"/>
            <rect x="3" y="18" width="2" height="5" rx="1" fill="white" opacity="0.08"/>
            <rect x="41" y="18" width="2" height="5" rx="1" fill="white" opacity="0.08"/>
          </svg>
        ),
    },
    {
        key: "bar",
        label: "Bar",
        searchCanonical: "bar",
        searchAlternatives: ["pub", "nightclub"],
        accent: "#f59e0b",
        accentSoft: "radial-gradient(ellipse at 60% 30%, #1c150088 0%, #0a0a0a 70%)",
        iconKey: "wine",
        glow: "#d97706",
        svg: (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 10 L16 40 H32 L34 10 Z" fill="#78350f" opacity="0.5"/>
            <path d="M14 10 L16 40 H32 L34 10 Z" fill="url(#beerGrad)" opacity="0.8"/>
            <path d="M15.2 16 L16 40 H32 L32.8 16 Z" fill="#d97706" opacity="0.7"/>
            <path d="M15.2 16 L16 40 H32 L32.8 16 Z" fill="#fbbf24" opacity="0.3"/>
            <ellipse cx="24" cy="12" rx="10" ry="4" fill="#fef3c7" opacity="0.9"/>
            <circle cx="18" cy="11" r="3" fill="#fef9ee"/>
            <circle cx="24" cy="10" r="3.5" fill="#fffbf0"/>
            <circle cx="30" cy="11" r="2.8" fill="#fef9ee"/>
            <circle cx="21" cy="13" r="2" fill="#fef3c7"/>
            <circle cx="27" cy="13" r="2.2" fill="#fef3c7"/>
            <circle cx="20" cy="28" r="1.2" fill="#fbbf24" opacity="0.4"/>
            <circle cx="25" cy="22" r="1" fill="#fbbf24" opacity="0.3"/>
            <circle cx="28" cy="32" r="0.8" fill="#fbbf24" opacity="0.4"/>
            <path d="M34 18 C42 18 42 32 34 32" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <ellipse cx="24" cy="40" rx="8.5" ry="1.5" fill="#92400e" opacity="0.5"/>
            <defs>
              <linearGradient id="beerGrad" x1="14" y1="10" x2="34" y2="40" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="#92400e" stopOpacity="0.4"/>
              </linearGradient>
            </defs>
          </svg>
        ),
    },
    {
        key: "random",
        label: "Random",
        searchCanonical: null,
        searchAlternatives: [],
        accent: "#94a3b8",
        accentSoft: "radial-gradient(ellipse at 60% 30%, #0f172a88 0%, #0a0a0a 70%)",
        iconKey: "shuffle",
        glow: "#64748b",
        svg: (
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="6" width="36" height="36" rx="8" fill="#1e293b" opacity="0.8"/>
            <rect x="6" y="6" width="36" height="36" rx="8" fill="url(#diceGrad)" opacity="0.5"/>
            <path d="M10 10 C14 10 18 12 18 16" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.15"/>
            <circle cx="16" cy="16" r="3.5" fill="#94a3b8"/>
            <circle cx="32" cy="16" r="3.5" fill="#94a3b8"/>
            <circle cx="24" cy="24" r="3.5" fill="#cbd5e1"/>
            <circle cx="16" cy="32" r="3.5" fill="#94a3b8"/>
            <circle cx="32" cy="32" r="3.5" fill="#94a3b8"/>
            <circle cx="16" cy="16" r="3.5" fill="#e2e8f0" opacity="0.2"/>
            <circle cx="32" cy="16" r="3.5" fill="#e2e8f0" opacity="0.2"/>
            <circle cx="24" cy="24" r="3.5" fill="white" opacity="0.25"/>
            <rect x="6" y="6" width="36" height="36" rx="8" stroke="#475569" strokeWidth="1" fill="none"/>
            <defs>
              <linearGradient id="diceGrad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.1"/>
              </linearGradient>
            </defs>
          </svg>
        ),
    },
];

export const getCategoryByKey = (key) =>
    CATEGORIES.find((c) => c.key === key) || null;

// The pool from which Random picks (everything except Random itself).
export const RANDOM_POOL = CATEGORIES.filter((c) => c.key !== "random");
