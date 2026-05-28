import React, { useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Trash2,
    Flame,
    Clock,
    MapPin,
    TrendingUp,
    Footprints,
    Bike,
    Car,
    Trophy,
    Star,
    Route,
    X,
    Sparkles,
    RefreshCw,
    Send,
    MessageSquare,
    Sun,
    Cloud,
    CloudRain,
    CloudSnow,
    CloudLightning,
    Wind,
    Thermometer,
    Droplets,
    Loader2,
} from "lucide-react";
import { listSessions, clearAllData } from "@/lib/db";
import { APP_VERSION } from "@/lib/version";
import { unregister as unregisterServiceWorker } from "@/serviceWorkerRegistration";
import {
    formatDistance,
    formatDuration,
    formatSpeed,
    calculateStreaks,
    MODE_LABELS,
} from "@/lib/geo";
import { useApp } from "@/lib/AppState";
import { haptics } from "@/lib/haptics";
import { CATEGORIES } from "@/lib/categories";

const MODE_EMOJIS = {
    explore: "🤠",
    date: "💘",
    escape: "🧘",
    social: "🎉",
    essentials: "🤵",
};

const MODE_SUGGESTIONS = {
    explore: [
        "Suggest a hidden park nearby",
        "Give me a walking challenge",
        "Show me cool places nearby"
    ],
    date: [
        "Suggest a cozy cafe spot",
        "Plan a scenic sunset walk",
        "Tease me about my dating stats"
    ],
    escape: [
        "Find a quiet place to escape",
        "Recommend a nature preserve",
        "Help me do a digital detox"
    ],
    social: [
        "Suggest a group hangout turf",
        "Find a lively cafe nearby",
        "Recommend social spots"
    ],
    essentials: [
        "Plan a quick errand route",
        "Suggest fuel + coffee stops",
        "Find a nearby ATM or store"
    ]
};

function TypewriterText({ text }) {
    const words = text.split(" ");
    return (
        <motion.span>
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                        duration: 0.08,
                        delay: i * 0.04,
                        ease: "easeOut"
                    }}
                >
                    {word}{" "}
                </motion.span>
            ))}
        </motion.span>
    );
}

// ── Tiny mode icon ────────────────────────────────────────────
function ModeIcon({ mode, size = 12, className = "" }) {
    const props = { size, strokeWidth: 2, className };
    if (mode === "bike") return <Bike {...props} />;
    if (mode === "car") return <Car {...props} />;
    return <Footprints {...props} />;
}

// ── Section wrapper ───────────────────────────────────────────
function Section({ title, children }) {
    return (
        <section className="mt-7">
            <div className="mb-3 flex items-baseline justify-between px-1">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/40">
                    {title}
                </h2>
            </div>
            {children}
        </section>
    );
}

// ── Stat card (small, reusable) ───────────────────────────────
function StatCard({ label, value, icon: Icon, color = "emerald" }) {
    const colors = {
        emerald: "text-emerald-400",
        blue: "text-blue-400",
        amber: "text-amber-400",
        rose: "text-rose-400",
        violet: "text-violet-400",
        cyan: "text-cyan-400",
    };
    return (
        <div className="flex flex-col items-center gap-1.5 rounded-2xl p-4 tg-glass">
            <div className={`${colors[color] || colors.emerald}`}>
                <Icon size={18} strokeWidth={1.8} />
            </div>
            <div className="text-lg font-black tracking-tight text-white">
                {value}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">
                {label}
            </div>
        </div>
    );
}

// StreakCard removed (replaced by standard StatCard for grid consistency)

// ── Weekly bar chart (pure CSS) ───────────────────────────────
function getWeatherDescription(code) {
    if (code === 0) return "Sunny / Clear Sky";
    if ([1, 2, 3].includes(code)) return "Partly Cloudy";
    if ([45, 48].includes(code)) return "Foggy";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzling";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Raining";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snowing";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Cloudy";
}

function getWeatherDetails(code) {
    if (code === 0) {
        return {
            label: "Sunny",
            desc: "Clear skies and bright sun.",
            icon: Sun,
            color: "from-amber-500/10 to-orange-500/10",
            border: "rgba(245,158,11,0.2)",
            glow: "rgba(245,158,11,0.12)",
            iconColor: "#f59e0b",
        };
    }
    if ([1, 2, 3].includes(code)) {
        return {
            label: "Partly Cloudy",
            desc: "Passing clouds and mild weather.",
            icon: Cloud,
            color: "from-blue-450/5 to-indigo-500/5",
            border: "rgba(99,102,241,0.15)",
            glow: "rgba(99,102,241,0.08)",
            iconColor: "#818cf8",
        };
    }
    if ([45, 48].includes(code)) {
        return {
            label: "Foggy",
            desc: "Reduced visibility, drive carefully.",
            icon: Cloud,
            color: "from-slate-450/5 to-gray-500/5",
            border: "rgba(107,114,128,0.15)",
            glow: "rgba(107,114,128,0.05)",
            iconColor: "#9ca3af",
        };
    }
    if ([51, 53, 55, 56, 57].includes(code)) {
        return {
            label: "Drizzle",
            desc: "Light mist and damp conditions.",
            icon: CloudRain,
            color: "from-cyan-500/5 to-blue-500/5",
            border: "rgba(59,130,246,0.15)",
            glow: "rgba(59,130,246,0.08)",
            iconColor: "#60a5fa",
        };
    }
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
        return {
            label: "Rainy",
            desc: "Continuous rainfall. Grab an umbrella!",
            icon: CloudRain,
            color: "from-blue-500/10 to-indigo-950/10",
            border: "rgba(37,99,235,0.2)",
            glow: "rgba(37,99,235,0.15)",
            iconColor: "#2563eb",
        };
    }
    if ([71, 73, 75, 77, 85, 86].includes(code)) {
        return {
            label: "Snowy",
            desc: "Cold snow fall and slippery ground.",
            icon: CloudSnow,
            color: "from-sky-100/5 to-blue-300/5",
            border: "rgba(186,230,253,0.2)",
            glow: "rgba(186,230,253,0.1)",
            iconColor: "#38bdf8",
        };
    }
    if ([95, 96, 99].includes(code)) {
        return {
            label: "Thunderstorm",
            desc: "Severe lightning and heavy rain.",
            icon: CloudLightning,
            color: "from-indigo-950/15 to-purple-950/15",
            border: "rgba(124,58,237,0.2)",
            glow: "rgba(124,58,237,0.15)",
            iconColor: "#8b5cf6",
        };
    }
    return {
        label: "Cloudy",
        desc: "Overcast skies and gray weather.",
        icon: Cloud,
        color: "from-slate-450/5 to-slate-650/5",
        border: "rgba(148,163,184,0.15)",
        glow: "rgba(148,163,184,0.05)",
        iconColor: "#94a3b8",
    };
}

function WeatherCard({ weather, loading, error, theme }) {
    if (loading) {
        return (
            <div className="rounded-[24px] p-6 text-center tg-glass flex items-center justify-center gap-3">
                <Loader2 size={18} className="animate-spin text-emerald-400" />
                <span className="text-sm font-semibold text-white/70">Fetching local weather...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-[24px] p-6 text-center tg-glass">
                <div className="text-sm font-semibold text-white/80">{error}</div>
                <div className="mt-1 text-xs text-white/40">Provide location access to get real-time weather.</div>
            </div>
        );
    }

    if (!weather) {
        return (
            <div className="rounded-[24px] p-6 text-center tg-glass">
                <div className="text-sm font-semibold text-white/80">No Weather Data</div>
                <div className="mt-1 text-xs text-white/40">Waiting for location fix...</div>
            </div>
        );
    }

    const details = getWeatherDetails(weather.code);
    const WeatherIcon = details.icon;

    return (
        <div className="rounded-[24px] p-5 tg-glass flex flex-col">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/10 border border-white/5 shadow-inner">
                        <WeatherIcon size={32} style={{ color: details.iconColor }} className="animate-pulse" />
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
                            Current Conditions
                        </div>
                        <div className="text-lg font-black text-white tracking-tight leading-none mt-1">
                            {details.label}
                        </div>
                        <div className="text-xs text-white/50 mt-1 leading-none">{details.desc}</div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-[32px] font-black text-white tracking-tighter leading-none">
                        {Math.round(weather.temp)}
                        <span className="text-[20px] font-bold align-super">{weather.unitTemp}</span>
                    </div>
                    <div className="text-[10px] font-bold text-white/40 mt-1">
                        Feels like {Math.round(weather.apparentTemp)}{weather.unitTemp}
                    </div>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
                <div className="text-center rounded-xl p-2 bg-white/[0.02] border border-white/[0.03]">
                    <div className="flex justify-center text-white/30 mb-0.5">
                        <Droplets size={12} />
                    </div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                        Humidity
                    </div>
                    <div className="text-xs font-black text-white mt-0.5">{weather.humidity}%</div>
                </div>
                <div className="text-center rounded-xl p-2 bg-white/[0.02] border border-white/[0.03]">
                    <div className="flex justify-center text-white/30 mb-0.5">
                        <Wind size={12} />
                    </div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                        Wind
                    </div>
                    <div className="text-xs font-black text-white mt-0.5">
                        {Math.round(weather.windSpeed)} <span className="text-[9px] font-bold">{weather.unitWind}</span>
                    </div>
                </div>
                <div className="text-center rounded-xl p-2 bg-white/[0.02] border border-white/[0.03]">
                    <div className="flex justify-center text-white/30 mb-0.5">
                        <CloudRain size={12} />
                    </div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                        Precip
                    </div>
                    <div className="text-xs font-black text-white mt-0.5">{weather.precipitation} mm</div>
                </div>
            </div>
        </div>
    );
}

// ── Category donut chart (pure SVG) ───────────────────────────
function CategoryDonut({ categories, theme }) {
    if (!categories || !categories.length) return null;

    const total = categories.reduce((a, c) => a + c.count, 0);
    const colors = [
        "#10B981", "#60A5FA", "#F59E0B", "#EF4444",
        "#A78BFA", "#EC4899", "#14B8A6", "#F97316",
    ];

    let offset = 0;
    const radius = 35;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="rounded-[24px] p-5 tg-glass">
            <div className="flex items-center gap-6">
                <div className="relative flex h-[90px] w-[90px] shrink-0 items-center justify-center">
                    <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
                        {/* Background track circle */}
                        <circle
                            cx="45"
                            cy="45"
                            r={radius}
                            fill="none"
                            stroke={theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)"}
                            strokeWidth="8"
                        />
                        {categories.map((cat, i) => {
                            const pct = cat.count / total;
                            const dash = pct * circumference;
                            const gap = circumference - dash;
                            const o = offset;
                            offset += pct * circumference;
                            return (
                                <circle
                                    key={cat.key}
                                    cx="45"
                                    cy="45"
                                    r={radius}
                                    fill="none"
                                    stroke={colors[i % colors.length]}
                                    strokeWidth="8"
                                    strokeDasharray={`${dash} ${gap}`}
                                    strokeDashoffset={-o}
                                    strokeLinecap="round"
                                    style={{ transition: "stroke-dasharray 0.5s ease" }}
                                />
                            );
                        })}
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-[20px] font-black leading-none text-white">
                            {total}
                        </span>
                        <span className="mt-1 text-[8px] font-bold uppercase tracking-wider text-white/30">
                            TOTAL
                        </span>
                    </div>
                </div>
                <div className="flex-1 flex flex-col gap-2.5">
                    {categories.slice(0, 4).map((cat, i) => (
                        <div key={cat.key} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ background: colors[i % colors.length] }}
                                />
                                <span className="text-xs font-semibold text-white/70">
                                    {cat.label}
                                </span>
                            </div>
                            <span className="text-xs font-bold text-white/95">
                                {cat.count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Groq API Client helper ────────────────────────────────────
async function fetchRoamieInsights(analyticsData, appMode) {
    const apiKey = process.env.REACT_APP_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("Groq API key is not configured.");
    }

    const url = "https://api.groq.com/openai/v1/chat/completions";

    const modeContexts = {
        explore: {
            persona: "a rugged, high-energy adventure captain who loves exploring hidden landmarks, parks, and hidden gems.",
            focus: "outdoor discovery, counting steps/cycling distance, hitting hidden spots, and touching grass.",
            tone: "rugged, energetic, and highly adventurous"
        },
        date: {
            persona: "a cheeky, playful cupid/romantic counselor who loves setting up perfect, cozy, or fun outdoor dates.",
            focus: "dating ideas, romantic walks, cozy cafes, dessert places, fine dining spots, scenic lookouts, and sharing moments with a partner.",
            tone: "romantic, cheeky, cute, and teasing"
        },
        escape: {
            persona: "a calm, mindful zen nature guide who loves helping users find quiet, peaceful spots to unwind and escape the hustle.",
            focus: "nature trails, waterfronts, quiet parks, viewing sunsets, and digital detoxing.",
            tone: "serene, grounding, yet lighthearted and encouraging"
        },
        social: {
            persona: "a lively, fun party promoter who loves organizing hangouts with friends, sports turfs, and night spots.",
            focus: "group activities, meeting up, sports turfs, gaming cafes, clubs, pubs, and social hangouts.",
            tone: "outgoing, loud, enthusiastic, and socially energetic"
        },
        essentials: {
            persona: "a witty, practical outdoor butler who helps users turn essential daily runs into fun mini-adventures.",
            focus: "running essential errands, visiting ATMs, convenience stores, pharmacies, salons, or getting fuel.",
            tone: "droll, helpful, slightly formal but witty and fun"
        }
    };

    const ctx = modeContexts[appMode] || modeContexts.explore;

    const systemPrompt = `You are Roamie, a playful, adventurous AI companion for "RoamOut", a PWA that helps users reconnect with the physical world, touch grass, and explore outside.
The user is currently in "${appMode.toUpperCase()}" mode. You must behave specifically as ${ctx.persona}.
Your focus is specifically on: ${ctx.focus}.
Your tone should be ${ctx.tone}.

Analyze user travel, activity, and weather data (which contains real-time temperature, precipitation, wind, humidity, and condition details) and respond with a JSON object containing exactly these four keys:
1. "title": A short, catchy, 2-3 word adventure persona title based on their roaming pattern and current weather state (e.g. "Waterfront Wanderer", "Storm Chasing Explorer", "Sunny Trail blazer").
2. "commentary": A short, cheeky, and highly playful analysis of their roam/exploration patterns specific to this mode and the current weather. Keep it to 2-3 sentences. Feel free to praise them for going out in rain/snow or encourage them depending on conditions.
3. "metricName": A creative, custom metric name related to their style in this mode (e.g. "Zen Vibe Level", "Errand Mastery", "Cupid Readiness", "Rain Resilience").
4. "metricValue": A creative score or grade for the metric (e.g. "95/100", "A+", "Elite", "Wanderer II").`;

    const userPrompt = `Here is my RoamOut activity data:\n${JSON.stringify(analyticsData, null, 2)}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.8,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content;
    if (!aiText) {
        throw new Error("No response content received from Groq.");
    }

    try {
        return JSON.parse(aiText.trim());
    } catch (e) {
        console.error("Failed to parse Groq response as JSON:", aiText);
        const cleaned = aiText.replace(/```json|```/g, "").trim();
        return JSON.parse(cleaned);
    }
}

// ── Mapbox Search helper to fetch nearby places in parallel ──
async function fetchNearbyPOIsForMode(lat, lng, appMode) {
    const token = process.env.REACT_APP_MAPBOX_API_KEY;
    if (!token) return [];

    const modeCategories = {
        explore: ["tourist_attraction", "viewpoint", "market", "restaurant", "tourist_attraction", "museum"],
        date: ["coffee_shop", "bookstore", "viewpoint", "bakery", "art_gallery", "restaurant"],
        escape: ["library", "beach", "viewpoint", "nature_preserve", "trailhead", "nature_preserve"],
        social: ["gym", "sports_field", "internet_cafe", "bar", "bar", "nightclub"],
        essentials: ["atm", "gas_station", "convenience_store", "pharmacy", "beauty_salon", "hospital"]
    };

    const categoriesToSearch = modeCategories[appMode] || modeCategories.explore;

    const searchPromises = categoriesToSearch.slice(0, 6).map(async (cat) => {
        try {
            const url = `https://api.mapbox.com/search/searchbox/v1/category/${cat}?access_token=${token}&proximity=${lng},${lat}&limit=2&language=en`;
            const res = await fetch(url);
            if (!res.ok) return [];
            const data = await res.json();
            return (data.features || []).map((f) => {
                const props = f.properties || {};
                const [flng, flat] = f.geometry?.coordinates || [0, 0];
                const dx = (flng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
                const dy = (flat - lat) * 111;
                const distanceKm = Math.sqrt(dx * dx + dy * dy);
                return {
                    name: props.name || props.name_preferred || "Unknown spot",
                    address: props.full_address || props.address || "",
                    category: cat,
                    distanceKm: +distanceKm.toFixed(2)
                };
            });
        } catch (e) {
            console.warn("[Mapbox Chat Search] failed for", cat, e);
            return [];
        }
    });

    try {
        const resultsArray = await Promise.all(searchPromises);
        return resultsArray.flat().sort((a, b) => a.distanceKm - b.distanceKm);
    } catch (e) {
        console.warn("[Mapbox Chat Search] Promise.all failed", e);
        return [];
    }
}

// ── Groq API Chat helper ──────────────────────────────────────
async function fetchRoamieChatResponse(chatHistory, analyticsData, currentInsights, appMode, nearbyPlaces, gpsActive) {
    const apiKey = process.env.REACT_APP_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("Groq API key is not configured.");
    }

    const url = "https://api.groq.com/openai/v1/chat/completions";

    const modeContexts = {
        explore: {
            persona: "a rugged, high-energy adventure captain who loves exploring hidden landmarks, parks, and hidden gems.",
            focus: "outdoor discovery, counting steps/cycling distance, hitting hidden spots, and touching grass.",
            tone: "rugged, energetic, and highly adventurous"
        },
        date: {
            persona: "a cheeky, playful cupid/romantic counselor who loves setting up perfect, cozy, or fun outdoor dates.",
            focus: "dating ideas, romantic walks, cozy cafes, dessert spots, fine dining, scenic lookouts, and sharing romantic moments with a partner/girlfriend.",
            tone: "romantic, cheeky, cute, and teasing"
        },
        escape: {
            persona: "a calm, mindful zen nature guide who loves helping users find quiet, peaceful spots to unwind and escape the hustle.",
            focus: "nature trails, waterfronts, quiet parks, viewing sunsets, and digital detoxing.",
            tone: "serene, grounding, yet lighthearted and encouraging"
        },
        social: {
            persona: "a lively, fun party promoter who loves organizing hangouts with friends, sports turfs, and night spots.",
            focus: "group activities, meeting up, sports turfs, gaming cafes, clubs, pubs, and social hangouts.",
            tone: "outgoing, loud, enthusiastic, and socially energetic"
        },
        essentials: {
            persona: "a witty, practical outdoor butler who helps users turn essential daily runs into fun mini-adventures.",
            focus: "running essential errands, visiting ATMs, convenience stores, pharmacies, salons, or getting fuel.",
            tone: "droll, helpful, slightly formal but witty and fun"
        }
    };

    const ctx = modeContexts[appMode] || modeContexts.explore;

    let placesInfo = "";
    if (gpsActive) {
        if (nearbyPlaces && nearbyPlaces.length > 0) {
            placesInfo = `Here are the ACTUAL, REAL nearest places found nearby the user via Mapbox Search:\n${JSON.stringify(nearbyPlaces, null, 2)}\nUse these real names, categories, and distances (in km) to answer any questions the user asks about where to go or places to visit. Do NOT hallucinate places. Suggest from this list.`;
        } else {
            placesInfo = `GPS location is active and enabled, but Mapbox search returned no POI results nearby for the user's current mode. If the user asks for places, advise them that location is active but no matching places were found nearby.`;
        }
    } else {
        placesInfo = `GPS location is currently not active or not granted. If the user asks for places, advise them to enable GPS location on the main screen so you can recommend exact spots.`;
    }

    const systemPrompt = `You are Roamie, a playful, adventurous AI companion for "RoamOut", a PWA that helps users reconnect with the physical world, touch grass, and explore outside.
The user is currently in "${appMode.toUpperCase()}" mode. You must behave specifically as ${ctx.persona}.
Your focus is specifically on: ${ctx.focus}.
Your tone should be ${ctx.tone}.
Keep your answers very brief (1-3 sentences maximum) as they will be displayed in a mobile-friendly chat widget.

${placesInfo}

Context about the user:
- Current activity stats: ${JSON.stringify(analyticsData.overview)}
- Current weather: ${JSON.stringify(analyticsData.currentWeather || "Unavailable")} (Reflect on these real-time conditions. If it's rainy, stormy, sunny, etc., react accordingly in your mode's tone and suggest weather-appropriate ideas!)
- Your recent persona title for them: "${currentInsights?.title || "Roamer"}"
- Your recent commentary on their stats: "${currentInsights?.commentary}"
- Their custom metric: ${currentInsights?.metricName || "Grass Touched"}: ${currentInsights?.metricValue || "100%"}

Respond directly to the user's latest message. Keep the conversation contextually relevant.`;

    const messages = [
        { role: "system", content: systemPrompt },
        ...chatHistory
    ];

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            temperature: 0.8,
            max_tokens: 150,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content;
    if (!aiText) {
        throw new Error("No response content received from Roamie.");
    }

    return aiText.trim();
}

// ── Roamie AI Insights Component ───────────────────────────────
function RoamieInsights({ sessions, stats, categories, bars, heat, theme, appMode, userLocation, weather }) {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState(null);

    const chatContainerRef = useRef(null);
    const cardRef = useRef(null);
    const apiKey = process.env.REACT_APP_GROQ_API_KEY;

    const cacheKey = useMemo(() => {
        const weatherKey = weather ? `${weather.code}_${Math.round(weather.temp)}` : "no_weather";
        return `roamie_${appMode}_${sessions.length}_${stats.totalActualKm.toFixed(2)}_${stats.streaks.current}_${weatherKey}`;
    }, [appMode, sessions.length, stats.totalActualKm, stats.streaks, weather]);

    useEffect(() => {
        if (!apiKey) return;
        const cached = localStorage.getItem("roamout_roamie_insights");
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (parsed.cacheKey === cacheKey) {
                    setInsights(parsed.insights);
                    setError(null);
                    return;
                }
            } catch (e) {
                // ignore
            }
        }
        setInsights(null);
    }, [cacheKey, apiKey]);

    // Persist chat messages to localStorage tied to cacheKey
    useEffect(() => {
        if (!apiKey) return;
        const cachedChat = localStorage.getItem("roamout_roamie_chat");
        if (cachedChat) {
            try {
                const parsed = JSON.parse(cachedChat);
                if (parsed.cacheKey === cacheKey) {
                    setChatMessages(parsed.messages);
                    return;
                }
            } catch (e) {
                // ignore
            }
        }
        setChatMessages([]);
    }, [cacheKey, apiKey]);

    // Scroll to bottom when messages or loading state changes
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    }, [chatMessages, chatLoading]);

    const saveChatMessages = (messages) => {
        setChatMessages(messages);
        localStorage.setItem("roamout_roamie_chat", JSON.stringify({
            cacheKey,
            messages
        }));
    };

    const processChatMessage = async (updatedMessages) => {
        setChatLoading(true);
        setChatError(null);

        const analyticsData = {
            overview: {
                totalSessions: sessions.length,
                totalDistanceKm: stats.totalActualKm,
                totalDurationSec: stats.totalDurationSec,
                averageSessionDurationSec: stats.avgDuration,
                longestSessionSec: stats.longestSession,
                uniquePlacesVisited: stats.uniquePlaces,
                currentStreak: stats.streaks.current,
                longestStreak: stats.streaks.longest,
            },
            currentWeather: weather ? {
                temperature: `${weather.temp}${weather.unitTemp}`,
                feelsLike: `${weather.apparentTemp}${weather.unitTemp}`,
                condition: getWeatherDescription(weather.code),
                humidity: `${weather.humidity}%`,
                windSpeed: `${weather.windSpeed} ${weather.unitWind}`,
                precipitation: `${weather.precipitation} mm`
            } : "Unknown/unavailable",
            activityModes: {
                walking: {
                    sessions: stats.walkCount,
                    distanceKm: stats.walkKm,
                },
                cycling: {
                    sessions: stats.bikeCount,
                    distanceKm: stats.bikeKm,
                },
                driving: {
                    sessions: stats.carCount,
                },
            },
            categories: categories.map(c => ({
                category: c.label,
                count: c.count,
            })),
            weeklyActivity: bars.map(day => ({
                date: day.date,
                distanceKm: day.distance,
                sessions: day.sessions,
            })),
            heatmap: heat.map(day => ({
                date: day.date,
                sessions: day.count,
                activeMinutes: day.totalMin,
            })),
            highlights: {
                favoriteCategory: stats.favCat,
                mostVisitedPlace: stats.mostVisited,
            },
            recentSessions: sessions.slice(0, 10).map(s => ({
                destination: s.destinationName,
                mode: s.mode,
                distanceKm: s.actualDistanceKm,
                durationSec: s.durationSec,
                averageSpeed: s.averageSpeed,
                startedAt: s.startedAt,
                category: s.categoryLabel,
            })),
        };

        let nearbyPlaces = [];
        if (userLocation && userLocation.lat && userLocation.lng) {
            try {
                nearbyPlaces = await fetchNearbyPOIsForMode(userLocation.lat, userLocation.lng, appMode);
            } catch (e) {
                console.warn("Failed to fetch nearby POIs for chat context", e);
            }
        }

        try {
            const responseText = await fetchRoamieChatResponse(updatedMessages, analyticsData, insights, appMode, nearbyPlaces, Boolean(userLocation));
            const updatedWithAI = [...updatedMessages, { role: "assistant", content: responseText }];
            saveChatMessages(updatedWithAI);
            haptics.success();
        } catch (err) {
            console.error(err);
            setChatError(err.message || "Failed to send message.");
            haptics.warn();
        } finally {
            setChatLoading(false);
        }
    };

    const handleSendChatMessage = async (e) => {
        if (e) e.preventDefault();
        const text = chatInput.trim();
        if (!text || chatLoading) return;

        haptics.select();

        const newUserMessage = { role: "user", content: text };
        const updatedMessages = [...chatMessages, newUserMessage];

        saveChatMessages(updatedMessages);
        setChatInput("");
        await processChatMessage(updatedMessages);
    };

    const handleSuggestionTap = async (text) => {
        if (chatLoading) return;

        haptics.select();

        const newUserMessage = { role: "user", content: text };
        const updatedMessages = [...chatMessages, newUserMessage];

        saveChatMessages(updatedMessages);
        await processChatMessage(updatedMessages);
    };

    const handleClearChat = () => {
        haptics.select();
        saveChatMessages([]);
        setChatError(null);
    };

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            const analyticsData = {
                overview: {
                    totalSessions: sessions.length,
                    totalDistanceKm: stats.totalActualKm,
                    totalDurationSec: stats.totalDurationSec,
                    averageSessionDurationSec: stats.avgDuration,
                    longestSessionSec: stats.longestSession,
                    uniquePlacesVisited: stats.uniquePlaces,
                    currentStreak: stats.streaks.current,
                    longestStreak: stats.streaks.longest,
                },
                currentWeather: weather ? {
                    temperature: `${weather.temp}${weather.unitTemp}`,
                    feelsLike: `${weather.apparentTemp}${weather.unitTemp}`,
                    condition: getWeatherDescription(weather.code),
                    humidity: `${weather.humidity}%`,
                    windSpeed: `${weather.windSpeed} ${weather.unitWind}`,
                    precipitation: `${weather.precipitation} mm`
                } : "Unknown/unavailable",
                activityModes: {
                    walking: {
                        sessions: stats.walkCount,
                        distanceKm: stats.walkKm,
                    },
                    cycling: {
                        sessions: stats.bikeCount,
                        distanceKm: stats.bikeKm,
                    },
                    driving: {
                        sessions: stats.carCount,
                    },
                },
                categories: categories.map(c => ({
                    category: c.label,
                    count: c.count,
                })),
                weeklyActivity: bars.map(day => ({
                    date: day.date,
                    distanceKm: day.distance,
                    sessions: day.sessions,
                })),
                heatmap: heat.map(day => ({
                    date: day.date,
                    sessions: day.count,
                    activeMinutes: day.totalMin,
                })),
                highlights: {
                    favoriteCategory: stats.favCat,
                    mostVisitedPlace: stats.mostVisited,
                },
                recentSessions: sessions.slice(0, 10).map(s => ({
                    destination: s.destinationName,
                    mode: s.mode,
                    distanceKm: s.actualDistanceKm,
                    durationSec: s.durationSec,
                    averageSpeed: s.averageSpeed,
                    startedAt: s.startedAt,
                    category: s.categoryLabel,
                })),
                photoStats: {
                    totalPhotos: 0,
                    averageGreenRatio: 0,
                },
            };

            const result = await fetchRoamieInsights(analyticsData, appMode);
            setInsights(result);
            localStorage.setItem("roamout_roamie_insights", JSON.stringify({
                cacheKey,
                insights: result
            }));
            haptics.success();
        } catch (err) {
            console.error(err);
            setError(err.message || "Something went wrong consulting Roamie.");
            haptics.warn();
        } finally {
            setLoading(false);
        }
    };

    if (!apiKey) {
        return (
            <Section title="Roamie AI">
                <div className="rounded-[24px] p-5 tg-glass border-dashed border-emerald-500/20">
                    <div className="flex gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Sparkles size={16} strokeWidth={1.8} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-white">Meet Roamie</h3>
                            <p className="mt-1 text-xs leading-relaxed text-white/45">
                                Unlock your playful AI companion to analyze your roaming habits and challenge you to roam out!
                            </p>
                            <div className="mt-3 inline-block rounded-lg bg-emerald-500/5 px-2.5 py-1.5 border border-emerald-500/10 text-[10px] font-medium text-emerald-400/80">
                                Set <code>REACT_APP_GROQ_API_KEY</code> in <code>frontend/.env</code> to activate.
                            </div>
                        </div>
                    </div>
                </div>
            </Section>
        );
    }

    return (
        <Section title="Roamie AI">
            <div
                ref={cardRef}
                onScroll={(e) => {
                    e.currentTarget.scrollTop = 0;
                    e.currentTarget.scrollLeft = 0;
                }}
                className="rounded-[24px] p-5 tg-glass relative overflow-hidden"
            >
                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
                                className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/25 text-sm shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                            >
                                {loading && (
                                    <span className="absolute inset-0 rounded-full border border-emerald-400 animate-ping opacity-75" />
                                )}
                                <span className="relative select-none leading-none">
                                    {MODE_EMOJIS[appMode] || "🤠"}
                                </span>
                            </motion.div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white leading-tight">Roamie</span>
                                <span className="text-[9px] font-medium text-emerald-400 uppercase tracking-widest leading-none mt-0.5">AI Companion</span>
                            </div>
                        </div>
                        {insights && !loading && (
                            <button
                                onClick={handleGenerate}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-white/50 hover:text-white hover:bg-white/[0.08]"
                                title="Refresh insights"
                            >
                                <RefreshCw size={12} />
                            </button>
                        )}
                    </div>

                    <AnimatePresence mode="wait">
                        {loading && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-5 py-6 flex flex-col items-center justify-center text-center gap-3"
                            >
                                <div className="relative flex h-8 w-8 items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500/20 border-t-emerald-400" />
                                    <Sparkles size={12} className="absolute text-emerald-400 animate-pulse" />
                                </div>
                                <div className="text-xs font-medium text-white/60">
                                    Roamie is analyzing your stats...
                                </div>
                            </motion.div>
                        )}

                        {!loading && error && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300"
                            >
                                <div className="font-semibold">Oops!</div>
                                <div className="mt-0.5 opacity-80">{error}</div>
                                <button
                                    onClick={handleGenerate}
                                    className="mt-2.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-[10px] font-bold text-white transition-colors"
                                >
                                    Try Again
                                </button>
                            </motion.div>
                        )}

                        {!loading && !error && !insights && (
                            <motion.div
                                key="get-insights"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-4 flex flex-col gap-3"
                            >
                                <p className="text-xs text-white/50 leading-relaxed">
                                    Ready for a playful breakdown of your outdoor roaming?
                                </p>
                                <button
                                    onClick={handleGenerate}
                                    className="w-full flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-xs font-black text-white hover:bg-emerald-400 shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] transition-all"
                                >
                                    <Sparkles size={13} />
                                    Roam with Roamie
                                </button>
                            </motion.div>
                        )}

                        {!loading && !error && insights && (
                            <motion.div
                                key="insights-display"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-4 flex flex-col gap-4"
                            >
                                {insights.title && (
                                    <div className="flex items-center justify-between gap-3 bg-white/[0.02] border border-white/[0.05] p-3.5 rounded-2xl">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">Your Persona</span>
                                            <span className="text-xs font-extrabold text-white truncate">{insights.title}</span>
                                        </div>
                                        {insights.metricName && (
                                            <div className="flex flex-col items-end shrink-0">
                                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">{insights.metricName}</span>
                                                <span className="text-xs font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">{insights.metricValue}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="text-xs leading-relaxed text-white/80 bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.05] italic">
                                    "{insights.commentary}"
                                </div>

                                <div className={`mt-4 pt-4 border-t ${theme === "light" ? "border-black/[0.06]" : "border-white/[0.06]"}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">
                                                <MessageSquare size={11} />
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${theme === "light" ? "text-black/50" : "text-white/50"}`}>
                                                Chat with Roamie
                                            </span>
                                        </div>
                                        {chatMessages.length > 0 && (
                                            <button
                                                onClick={handleClearChat}
                                                className="text-[9px] font-bold uppercase tracking-wider text-rose-400/60 hover:text-rose-400 transition-colors"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>

                                    {/* Chat Messages Area */}
                                    <div ref={chatContainerRef} className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 mb-3 no-scrollbar">
                                        {chatMessages.length === 0 ? (
                                            <div className={`text-[11px] py-3 text-center rounded-xl border ${theme === "light"
                                                    ? "text-black/45 bg-black/[0.02] border-black/[0.04]"
                                                    : "text-white/45 bg-white/[0.02] border-white/[0.04]"
                                                }`}>
                                                Ask me anything about your stats or get advice on where to explore!
                                            </div>
                                        ) : (
                                            chatMessages.map((msg, idx) => {
                                                const isNewest = idx === chatMessages.length - 1;
                                                const isAssistant = msg.role !== "user";
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`flex flex-col max-w-[85%] rounded-2xl px-3 py-2.5 text-xs leading-normal ${!isAssistant
                                                                ? (theme === "light"
                                                                    ? "self-end bg-black/[0.05] text-black/85 rounded-br-none border border-black/[0.08]"
                                                                    : "self-end bg-white/[0.06] text-white/90 rounded-br-none border border-white/[0.08]")
                                                                : (theme === "light"
                                                                    ? "self-start bg-emerald-500/10 text-emerald-800 rounded-bl-none border border-emerald-500/15"
                                                                    : "self-start bg-emerald-500/10 text-emerald-200 rounded-bl-none border border-emerald-500/15")
                                                            }`}
                                                    >
                                                        {isAssistant && isNewest ? (
                                                            <TypewriterText text={msg.content} />
                                                        ) : (
                                                            msg.content
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}

                                        {chatLoading && (
                                            <div className={`self-start flex items-center gap-1 border rounded-2xl rounded-bl-none px-3 py-2.5 text-xs ${theme === "light"
                                                    ? "bg-emerald-500/10 border-emerald-500/15 text-emerald-700/80"
                                                    : "bg-emerald-500/10 border-emerald-500/15 text-emerald-400/80"
                                                }`}>
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        )}

                                        {chatError && (
                                            <div className="text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-center">
                                                {chatError}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Suggestion Chips */}
                                    {chatMessages.length === 0 && !chatLoading && (
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {(MODE_SUGGESTIONS[appMode] || MODE_SUGGESTIONS.explore).map((sugg, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleSuggestionTap(sugg)}
                                                    className="text-[10px] font-medium text-white/60 bg-white/[0.03] border border-white/[0.06] hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/20 px-2.5 py-1.5 rounded-full transition-all duration-200 text-left active:scale-95"
                                                >
                                                    {sugg}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Input bar */}
                                    <form onSubmit={handleSendChatMessage} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onFocus={() => {
                                                if (cardRef.current) {
                                                    cardRef.current.scrollTop = 0;
                                                    cardRef.current.scrollLeft = 0;
                                                }
                                            }}
                                            onBlur={() => {
                                                if (cardRef.current) {
                                                    cardRef.current.scrollTop = 0;
                                                    cardRef.current.scrollLeft = 0;
                                                }
                                            }}
                                            placeholder="Ask Roamie..."
                                            disabled={chatLoading}
                                            className={`flex-1 h-9 rounded-xl px-3 text-base md:text-xs focus:outline-none focus:border-emerald-500/50 transition-all disabled:opacity-50 ${theme === "light"
                                                    ? "bg-black/[0.04] border-black/[0.08] text-black placeholder-black/40"
                                                    : "bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30"
                                                }`}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!chatInput.trim() || chatLoading}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:hover:bg-emerald-500"
                                        >
                                            <Send size={12} />
                                        </button>
                                    </form>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </Section>
    );
}

// ══════════════════════════════════════════════════════════════
// Main InsightsView
// ══════════════════════════════════════════════════════════════
export default function InsightsView() {
    const {
        units,
        theme,
        appMode,
        userLocation,
        weather,
        weatherLoading,
        weatherError
    } = useApp();
    const [sessions, setSessions] = useState([]);
    const [confirming, setConfirming] = useState(false);
    const [wiping, setWiping] = useState(false);

    const load = async () => {
        try {
            const s = await listSessions();
            setSessions(s);
        } catch {
            /* ignore */
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleWipe = async () => {
        setWiping(true);
        try {
            // 1. Clear IndexedDB data
            await clearAllData();

            // 2. Clear localStorage
            localStorage.clear();

            // 3. Reset React state and trigger haptics
            setSessions([]);
            haptics.success();

            // 4. Fetch the latest deployed version and check for a mismatch
            let versionMatches = true;
            let deployedVersion = APP_VERSION;
            try {
                const res = await fetch(`/version.json?t=${Date.now()}`);
                if (res.ok) {
                    const data = await res.json();
                    deployedVersion = data.version || APP_VERSION;
                    if (deployedVersion !== APP_VERSION) {
                        versionMatches = false;
                    }
                }
            } catch (err) {
                console.error("[VersionCheck] Failed to check app version during wipe:", err);
            }

            // Restore the app-version to localStorage so settings display works
            localStorage.setItem("app-version", deployedVersion);

            // 5. If version doesn't match, clear service workers/caches and reload the site
            if (!versionMatches) {
                console.log("[VersionCheck] Version mismatch detected. Clearing caches and reloading...");
                await unregisterServiceWorker();
                if (window.caches) {
                    try {
                        const keys = await caches.keys();
                        await Promise.all(keys.map((key) => caches.delete(key)));
                    } catch (e) {
                        console.error("[VersionCheck] Failed to clear caches:", e);
                    }
                }
                window.location.reload(true);
            }
        } catch (err) {
            console.error("Error wiping data:", err);
        } finally {
            setWiping(false);
            setConfirming(false);
        }
    };

    const categories = useMemo(() => {
        const map = {};
        sessions.forEach((s) => {
            const key = s.categoryKey || "unknown";
            if (!map[key]) map[key] = { key, count: 0, label: s.categoryLabel || key };
            map[key].count++;
        });
        return Object.values(map).sort((a, b) => b.count - a.count);
    }, [sessions]);

    const bars = useMemo(() => {
        const sessionMap = new Map();
        sessions.forEach((s) => {
            if (!s.startedAt) return;
            const d = new Date(s.startedAt);
            d.setHours(0, 0, 0, 0);
            const time = d.getTime();
            if (!sessionMap.has(time)) {
                sessionMap.set(time, { distance: 0, count: 0 });
            }
            const record = sessionMap.get(time);
            record.distance += s.actualDistanceKm || 0;
            record.count += 1;
        });

        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const time = d.getTime();
            const record = sessionMap.get(time) || { distance: 0, count: 0 };
            days.push({
                date: d,
                distance: record.distance,
                sessions: record.count
            });
        }
        return days;
    }, [sessions]);

    // Build O(1) date-keyed lookup dictionary and single-pass metrics aggregation
    const stats = useMemo(() => {
        let totalActualKm = 0;
        let totalDurationSec = 0;
        let longestSession = 0;
        const placeNames = new Set();
        const visitCounts = {};
        const catCounts = {};

        let walkCount = 0;
        let bikeCount = 0;
        let carCount = 0;
        let walkKm = 0;
        let bikeKm = 0;

        sessions.forEach((s) => {
            const dist = s.actualDistanceKm || 0;
            const dur = s.durationSec || 0;

            totalActualKm += dist;
            totalDurationSec += dur;
            longestSession = Math.max(longestSession, dur);

            if (s.destinationName) {
                placeNames.add(s.destinationName);
                visitCounts[s.destinationName] = (visitCounts[s.destinationName] || 0) + 1;
            }

            const catKey = s.categoryLabel || s.categoryKey;
            if (catKey) {
                catCounts[catKey] = (catCounts[catKey] || 0) + 1;
            }

            const mode = s.mode || "walk";
            if (mode === "walk") {
                walkCount++;
                walkKm += dist;
            } else if (mode === "bike") {
                bikeCount++;
                bikeKm += dist;
            } else if (mode === "car") {
                carCount++;
            }
        });

        const avgDuration = sessions.length > 0 ? Math.round(totalDurationSec / sessions.length) : 0;
        const mostVisited = Object.entries(visitCounts).sort((a, b) => b[1] - a[1])[0];
        const favCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
        const streaks = calculateStreaks(sessions);

        return {
            totalActualKm,
            totalDurationSec,
            longestSession,
            avgDuration,
            uniquePlaces: placeNames.size,
            mostVisited: mostVisited ? mostVisited[0] : null,
            favCat: favCat ? favCat[0] : null,
            streaks,
            walkCount,
            bikeCount,
            carCount,
            walkKm,
            bikeKm,
        };
    }, [sessions]);

    // ── Heatmap (30 days) ──────────────────────────────────────
    const heat = useMemo(() => {
        const sessionMap = new Map();
        sessions.forEach((s) => {
            if (!s.startedAt) return;
            const d = new Date(s.startedAt);
            d.setHours(0, 0, 0, 0);
            const time = d.getTime();
            if (!sessionMap.has(time)) {
                sessionMap.set(time, { count: 0, durationSec: 0 });
            }
            const record = sessionMap.get(time);
            record.count += 1;
            record.durationSec += s.durationSec || 0;
        });

        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const time = d.getTime();
            const record = sessionMap.get(time) || { count: 0, durationSec: 0 };
            days.push({
                date: d,
                count: record.count,
                totalMin: record.durationSec / 60
            });
        }
        return days;
    }, [sessions]);
    const maxHeat = Math.max(1, ...heat.map((d) => d.totalMin || d.count));

    // ── Tooltip state for heatmap ──────────────────────────────
    const [heatTip, setHeatTip] = useState(null);

    return (
        <div
            data-testid="insights-view"
            className="relative w-full px-5 pt-safe transition-[padding-bottom] duration-300 ease-out tg-no-select pb-40"
        >
            <div className="tg-ambient" />
            <motion.header
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 pt-4 pb-2"
            >
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
                    Stats
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                    Where you've been.
                </h1>
            </motion.header>

            <div className="relative z-10">
                {/* ── Roamie AI Insights ─────────────────────── */}
                <RoamieInsights
                    sessions={sessions}
                    stats={stats}
                    categories={categories}
                    bars={bars}
                    heat={heat}
                    theme={theme}
                    appMode={appMode}
                    userLocation={userLocation}
                    weather={weather}
                />

                {/* ── Weather Section ───────────────────────────── */}
                <Section title="Current Weather">
                    <WeatherCard weather={weather} loading={weatherLoading} error={weatherError} theme={theme} />
                </Section>

                {/* ── Hero stats grid ────────────────────────── */}
                <Section title="Overview">
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            label="Sessions"
                            value={sessions.length}
                            icon={MapPin}
                            color="blue"
                        />
                        <StatCard
                            label="Distance"
                            value={
                                stats.totalActualKm >= 1
                                    ? `${stats.totalActualKm.toFixed(1)}km`
                                    : `${Math.round(stats.totalActualKm * 1000)}m`
                            }
                            icon={Route}
                            color="emerald"
                        />
                        <StatCard
                            label="Time"
                            value={formatDuration(stats.totalDurationSec)}
                            icon={Clock}
                            color="cyan"
                        />
                        <StatCard
                            label="Places"
                            value={stats.uniquePlaces}
                            icon={Star}
                            color="violet"
                        />
                        <StatCard
                            label="Streak"
                            value={`${stats.streaks.current}d`}
                            icon={Flame}
                            color="amber"
                        />
                        <StatCard
                            label="Avg Session"
                            value={formatDuration(stats.avgDuration)}
                            icon={TrendingUp}
                            color="rose"
                        />
                    </div>
                </Section>

                {/* ── Sessions (rich cards) ──────────────────── */}
                <Section title="Sessions">
                    {sessions.length === 0 ? (
                        <div
                            data-testid="insights-empty"
                            className="rounded-3xl p-6 text-center tg-glass"
                        >
                            <div className="text-sm font-semibold text-white">
                                No sessions yet.
                            </div>
                            <div className="mt-1 text-xs text-white/45">
                                Pick a destination from the home screen to
                                begin.
                            </div>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {sessions.map((s) => {
                                const mode = s.mode || "walk";
                                const hasActual =
                                    s.actualDistanceKm != null &&
                                    s.actualDistanceKm > 0;
                                const distDisplay = hasActual
                                    ? `${s.actualDistanceKm.toFixed(2)} km`
                                    : formatDistance(s.distance, units);
                                const plannedDisplay =
                                    s.plannedDistanceKm != null
                                        ? `${s.plannedDistanceKm.toFixed(1)} km planned`
                                        : null;

                                return (
                                    <li
                                        key={s.id}
                                        className="rounded-2xl px-4 py-3 tg-glass"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Mode icon */}
                                            <div
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                                style={{
                                                    background: `${s.accent || "#10B981"}15`,
                                                    color:
                                                        s.accent || "#10B981",
                                                }}
                                            >
                                                <ModeIcon mode={mode} size={16} />
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-semibold text-white">
                                                    {s.destinationName}
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-white/45">
                                                    <span>
                                                        {new Date(
                                                            s.startedAt,
                                                        ).toLocaleString(
                                                            undefined,
                                                            {
                                                                month: "short",
                                                                day: "numeric",
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                            },
                                                        )}
                                                    </span>
                                                    {s.durationSec > 0 && (
                                                        <>
                                                            <span className="text-white/20">
                                                                ·
                                                            </span>
                                                            <span>
                                                                {formatDuration(
                                                                    s.durationSec,
                                                                )}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Distance */}
                                            <div className="text-right">
                                                <div className="text-xs font-semibold text-white/70">
                                                    {distDisplay}
                                                </div>
                                                {plannedDisplay && (
                                                    <div className="text-[10px] text-white/30">
                                                        {plannedDisplay}
                                                    </div>
                                                )}
                                                <div className="mt-0.5 flex items-center justify-end gap-1">
                                                    <span
                                                        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                                                        style={{
                                                            background:
                                                                theme === "light"
                                                                    ? (mode === "walk"
                                                                        ? "rgba(4, 120, 87, 0.15)"
                                                                        : mode === "bike"
                                                                            ? "rgba(29, 78, 216, 0.15)"
                                                                            : "rgba(109, 40, 217, 0.15)")
                                                                    : (mode === "walk"
                                                                        ? "rgba(16,185,129,0.12)"
                                                                        : mode ===
                                                                            "bike"
                                                                            ? "rgba(96,165,250,0.12)"
                                                                            : "rgba(167,139,250,0.12)"),
                                                            color:
                                                                theme === "light"
                                                                    ? (mode === "walk"
                                                                        ? "#047857"
                                                                        : mode === "bike"
                                                                            ? "#1d4ed8"
                                                                            : "#6d28d9")
                                                                    : (mode === "walk"
                                                                        ? "#6EE7B7"
                                                                        : mode ===
                                                                            "bike"
                                                                            ? "#93C5FD"
                                                                            : "#C4B5FD"),
                                                        }}
                                                    >
                                                        <ModeIcon
                                                            mode={mode}
                                                            size={8}
                                                        />
                                                        {MODE_LABELS[mode] ||
                                                            mode}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Speed row for walk+bike */}
                                        {(mode === "walk" || mode === "bike") &&
                                            s.averageSpeed > 0 && (
                                                <div className="mt-2 flex gap-3 border-t border-white/[0.04] pt-2">
                                                    <span className="flex items-center gap-1 text-[10px] text-white/40">
                                                        <TrendingUp
                                                            size={10}
                                                            className="text-emerald-400"
                                                        />
                                                        {formatSpeed(
                                                            s.averageSpeed,
                                                            units,
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Section>

                {/* ── Category breakdown ─────────────────────── */}
                {sessions.length > 0 && (
                    <Section title="Categories">
                        <CategoryDonut categories={categories} theme={theme} />
                    </Section>
                )}

                {/* ── Exploration highlights ─────────────────── */}
                {sessions.length > 0 && (
                    <Section title="Exploration">
                        <div className="rounded-3xl p-5 tg-glass">
                            <div className="flex flex-col gap-3">
                                {stats.favCat && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-white/50">
                                            Favorite Category
                                        </span>
                                        <span className="text-sm font-bold text-white">
                                            {stats.favCat}
                                        </span>
                                    </div>
                                )}
                                {stats.mostVisited && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-white/50">
                                            Most Visited
                                        </span>
                                        <span className="max-w-[55%] truncate text-sm font-bold text-white">
                                            {stats.mostVisited}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/50">
                                        Longest Session
                                    </span>
                                    <span className="text-sm font-bold text-white">
                                        {formatDuration(stats.longestSession)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/50">
                                        Avg Session
                                    </span>
                                    <span className="text-sm font-bold text-white">
                                        {formatDuration(stats.avgDuration)}
                                    </span>
                                </div>
                                {stats.streaks.longest > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-white/50">
                                            Best Streak
                                        </span>
                                        <span className="text-sm font-bold text-emerald-400">
                                            {stats.streaks.longest} days
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Section>
                )}

                {/* ── Mode breakdown ─────────────────────────── */}
                {sessions.length > 0 &&
                    (stats.walkCount > 0 ||
                        stats.bikeCount > 0 ||
                        stats.carCount > 0) && (
                        <Section title="By Mode">
                            <div className="flex flex-col gap-2">
                                {stats.walkCount > 0 && (
                                    <div className="flex items-center gap-3 rounded-2xl p-4 tg-glass">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                                            <Footprints size={16} strokeWidth={1.8} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white">
                                                Walking
                                            </div>
                                            <div className="text-[11px] text-white/45">
                                                {stats.walkCount} sessions ·{" "}
                                                {stats.walkKm.toFixed(1)} km
                                            </div>
                                        </div>

                                    </div>
                                )}
                                {stats.bikeCount > 0 && (
                                    <div className="flex items-center gap-3 rounded-2xl p-4 tg-glass">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                                            <Bike size={16} strokeWidth={1.8} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white">
                                                Cycling
                                            </div>
                                            <div className="text-[11px] text-white/45">
                                                {stats.bikeCount} sessions ·{" "}
                                                {stats.bikeKm.toFixed(1)} km
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {stats.carCount > 0 && (
                                    <div className="flex items-center gap-3 rounded-2xl p-4 tg-glass">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                                            <Car size={16} strokeWidth={1.8} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-white">
                                                Driving
                                            </div>
                                            <div className="text-[11px] text-white/45">
                                                {stats.carCount} sessions
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Section>
                    )}



                {/* ── Storage / clear data ───────────────────── */}
                <Section title="Storage">
                    <div className="rounded-3xl p-5 tg-glass">
                        <div className="flex flex-col gap-4">
                            <div className="min-w-0">
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    On-Device Storage
                                </div>
                                <div className="mt-2 text-[11px] leading-relaxed text-white/40">
                                    Sessions and preferences live
                                    locally in this browser. Clearing removes
                                    them permanently from this device.
                                </div>
                            </div>
                            <motion.button
                                data-testid="stats-clear"
                                onClick={() => {
                                    haptics.warn();
                                    setConfirming(true);
                                }}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.04] text-xs font-bold text-white/50 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/15 transition-colors duration-200"
                            >
                                <Trash2 size={13} strokeWidth={2} />
                                Clear Data
                            </motion.button>
                        </div>
                    </div>
                </Section>
            </div>

            {/* ── Confirm wipe dialog ───────────────────────── */}
            <AnimatePresence>
                {confirming && (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-end justify-center px-5"
                        style={{
                            background: theme === "light" ? "rgba(213,213,220,0.5)" : "rgba(8,8,10,0.55)",
                            backdropFilter: "blur(14px)",
                        }}
                        onClick={() => setConfirming(false)}
                    >
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 30, opacity: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 320,
                                damping: 28,
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mb-32 w-full max-w-sm rounded-3xl p-6 tg-glass-strong"
                            data-testid="clear-confirm"
                        >
                            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-300/80">
                                Heads up
                            </div>
                            <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                                Erase everything?
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-white/55">
                                All sessions and saved
                                preferences will be removed from this browser.
                                This cannot be undone.
                            </p>
                            <div className="mt-5 flex gap-2">
                                <button
                                    data-testid="clear-cancel"
                                    onClick={() => {
                                        haptics.tap();
                                        setConfirming(false);
                                    }}
                                    className="flex-1 rounded-full bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    data-testid="clear-confirm-btn"
                                    onClick={handleWipe}
                                    disabled={wiping}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-500/85 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                                >
                                    <Trash2 size={14} strokeWidth={2.2} />
                                    {wiping ? "Clearing…" : "Erase"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
