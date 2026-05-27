import React, { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import { AppProvider, useApp } from "@/lib/AppState";
import { CATEGORIES, getCategoryByKey } from "@/lib/categories";
import { findNearestPOI, hasMapboxToken } from "@/lib/mapbox";
import { saveSession } from "@/lib/db";
import { haversineMeters, MODE_MAP } from "@/lib/geo";
import { haptics } from "@/lib/haptics";
import { useSessionTracker } from "@/lib/sessionTracker";
import { Compass, Map as MapIcon, Leaf } from "lucide-react";

import DesktopInterstitial from "@/components/DesktopInterstitial";
import HomeScreen from "@/components/HomeScreen";
import TabBar from "@/components/TabBar";
import CompassView from "@/components/CompassView";
import MapView from "@/components/MapView";
import InsightsView from "@/components/InsightsView";
import SettingsView from "@/components/SettingsView";
import { checkAppVersion } from "@/lib/versionCheck";

// Override flags for testing / dev preview.
function isForcedMobile() {
  if (typeof window === "undefined") return false;
  const qs = new URLSearchParams(window.location.search);
  if (qs.get("mobile") === "1") return true;
  if (qs.get("desktop") === "1") return false;
  return null;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    const forced = isForcedMobile();
    if (forced !== null) return forced;
    if (typeof window === "undefined") return true;
    return window.innerWidth < 820;
  });
  useEffect(() => {
    const forced = isForcedMobile();
    if (forced !== null) return;
    const onResize = () => setIsMobile(window.innerWidth < 820);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

function ResolvingOverlay({ category }) {
  const { theme } = useApp();
  const Icon = category?.Icon;
  const accentColor = category?.accent || "#10b981";
  return (
    <motion.div
      data-testid="resolving-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[55] flex flex-col items-center justify-center px-8 text-center"
      style={{
        background: theme === "light" ? "rgba(213,213,220,0.5)" : "rgba(8,8,10,0.6)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div className="relative flex items-center justify-center h-16 w-16">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(closest-side, ${accentColor}4D, transparent 75%)`,
            filter: "blur(8px)",
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            borderColor: "transparent",
            borderLeftColor: accentColor,
            borderBottomColor: accentColor,
          }}
        />
        {Icon && (
          <div className="relative z-10 flex items-center justify-center" style={{ color: accentColor }}>
            <Icon size={24} strokeWidth={2.2} />
          </div>
        )}
      </div>
      <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
        Resolving
      </div>
      <div className="mt-2 text-lg font-black tracking-tight text-white">
        Nearest {category?.label || "place"}
      </div>
      <div className="mt-1 text-xs text-white/45">
        Reading your real location · live route incoming.
      </div>
    </motion.div>
  );
}


function SplashScreen() {
  const { theme } = useApp();
  const isLight = theme === "light";
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -16, filter: "blur(8px)", transition: { duration: 0.45, ease: [0.32, 0.94, 0.6, 1] } }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{
        background: isLight ? "#d1d1d6" : "#060608",
      }}
    >
      {/* Radial ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isLight
            ? "radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.08) 0%, transparent 65%)"
            : "radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.16) 0%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />
      <div className="flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 1.15, 1.05], opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative flex items-center justify-center h-20 w-20 rounded-[28px] tg-glass"
          style={{
            background: isLight ? "rgba(34, 197, 94, 0.08)" : "rgba(34, 197, 94, 0.12)",
            borderColor: isLight ? "rgba(34, 197, 94, 0.25)" : "rgba(34, 197, 94, 0.35)",
            boxShadow: isLight
              ? "0 10px 30px rgba(34, 197, 94, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)"
              : "0 12px 40px rgba(34, 197, 94, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Glowing dot */}
          <div
            className="absolute rounded-full"
            style={{
              width: 44,
              height: 44,
              background: "radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)",
              filter: "blur(4px)",
            }}
          />
          <Leaf size={38} strokeWidth={2} style={{ color: "#22c55e" }} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-1.5"
        >
          <h1
            className="text-[20px] font-black uppercase tracking-[0.35em] text-white"
            style={{
              textShadow: isLight
                ? "0 0 20px rgba(34, 197, 94, 0.2)"
                : "0 0 30px rgba(34, 197, 94, 0.4)",
            }}
          >
            RoamOut
          </h1>
          <p className="text-[10px] font-bold tracking-[0.15em] text-white/35">
            FIND NATURE · FEEL ALIVE
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ModeOverlayAnimation({ mode }) {
  const { theme } = useApp();
  if (!mode) return null;

  const isLight = theme === "light";
  const Icon = mode.icon;

  const colors = {
    emerald: { accent: "#059669", dark: "text-emerald-300", light: "text-emerald-700", rgb: "5,150,105" },
    rose: { accent: "#e11d48", dark: "text-rose-300", light: "text-rose-700", rgb: "225,29,72" },
    cyan: { accent: "#0891b2", dark: "text-cyan-300", light: "text-cyan-700", rgb: "8,145,178" },
    violet: { accent: "#7c3aed", dark: "text-violet-300", light: "text-violet-700", rgb: "124,58,237" },
    amber: { accent: "#d97706", dark: "text-amber-300", light: "text-amber-700", rgb: "217,119,6" },
  }[mode.color] || {
    accent: "#6b7280",
    dark: "text-white",
    light: "text-gray-700",
    rgb: "107,114,128"
  };

  const { accent, rgb } = colors;
  const textClass = isLight ? colors.light : colors.dark;

  const bg = isLight ? "#d1d1d6" : "#060608";
  const orbAlpha1 = isLight ? "0.20" : "0.35";
  const orbAlpha2 = isLight ? "0.14" : "0.28";

  const cardBg = isLight ? `rgba(${rgb},0.07)` : `rgba(${rgb},0.08)`;
  const cardBorder = isLight ? `rgba(${rgb},0.30)` : `rgba(${rgb},0.25)`;
  const cardShadow = isLight
    ? `0 4px 40px rgba(${rgb},0.18), inset 0 1px 0 rgba(255,255,255,0.4)`
    : `0 0 60px rgba(${rgb},0.25), inset 0 1px 0 rgba(255,255,255,0.12)`;

  const eyebrowClass = isLight ? "text-black/35" : "text-white/35";
  const glareClass = isLight
    ? "absolute inset-0 rounded-[36px] pointer-events-none opacity-30 bg-gradient-to-br from-white/40 via-white/10 to-transparent"
    : "absolute inset-0 rounded-[36px] pointer-events-none opacity-30 bg-gradient-to-br from-white/20 via-transparent to-transparent";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{
            scale: [1, 1.18, 1],
            opacity: [parseFloat(orbAlpha1), parseFloat(orbAlpha1) + 0.15, parseFloat(orbAlpha1)]
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/2 -left-1/2 w-[160vw] h-[160vw] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${rgb},${orbAlpha1}) 0%, transparent 65%)`,
            filter: "blur(120px)"
          }}
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{
            scale: [1.1, 0.9, 1.1],
            opacity: [parseFloat(orbAlpha2), parseFloat(orbAlpha2) + 0.12, parseFloat(orbAlpha2)]
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute -bottom-1/2 -right-1/2 w-[160vw] h-[160vw] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${rgb},${orbAlpha2}) 0%, transparent 65%)`,
            filter: "blur(130px)"
          }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{
            scale: [1, 1.6],
            opacity: [isLight ? 0.25 : 0.18, 0]
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
          className="absolute rounded-full border"
          style={{ width: 220, height: 220, borderColor: `rgba(${rgb}, 0.5)` }}
        />
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{
            scale: [1, 1.35],
            opacity: [isLight ? 0.35 : 0.28, 0]
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.7 }}
          className="absolute rounded-full border"
          style={{ width: 180, height: 180, borderColor: `rgba(${rgb}, 0.5)` }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="absolute rounded-full"
          style={{
            width: 148,
            height: 148,
            background: `radial-gradient(circle, rgba(${rgb},${isLight ? "0.18" : "0.22"}) 0%, transparent 75%)`,
            filter: "blur(12px)"
          }}
        />
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.05 }}
          className="relative flex items-center justify-center w-[120px] h-[120px] rounded-[36px]"
          style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}
        >
          <div className={glareClass} />
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 20, delay: 0.18 }}
          >
            <Icon size={56} strokeWidth={1.6} style={{ color: accent }} />
          </motion.div>
        </motion.div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center mt-14 px-8">
        <motion.p
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.28 }}
          className={`text-[11px] font-semibold uppercase tracking-[0.35em] ${eyebrowClass}`}
        >
          {mode.label} Mode
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.36 }}
          className={`mt-1 text-[42px] font-black tracking-tight leading-none ${textClass}`}
          style={{ textShadow: isLight ? `0 0 30px rgba(${rgb}, 0.25)` : `0 0 40px rgba(${rgb}, 0.4)` }}
        >
          {mode.label}
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.42 }}
          className="mt-8 w-16 h-[2px] rounded-full origin-center"
          style={{ background: `rgba(${rgb}, ${isLight ? "0.5" : "0.6"})` }}
        />
      </div>
    </motion.div>
  );
}

function Shell() {
  const {
    mode,
    update,
    userLocation,
    selectedCategory,
    destination,
    requestLocation,
    startWatchingLocation,
    currentTab,
    resetSession,
    units,
    travelMode,
    theme,
    animatingMode,
  } = useApp();

  const [showSplash, setShowSplash] = useState(false);
  useEffect(() => {
    const hasOpened = localStorage.getItem("tg_has_opened");
    if (!hasOpened) {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
        localStorage.setItem("tg_has_opened", "true");
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, []);

  const tracker = useSessionTracker();
  const plannedDistanceRef = useRef(null);

  const [resolveError, setResolveError] = useState(null);

  // Auto-watch geolocation once we're active or on map/compass/home/insights screens.
  useEffect(() => {
    startWatchingLocation();
  }, [startWatchingLocation]);

  const handleSelectCategory = async (cat) => {
    haptics.select();
    setResolveError(null);
    let resolved = cat;
    // eslint-disable-next-line no-console
    console.log("[tg] select category", cat.key, "→ resolved", resolved.key);
    update({ mode: "resolving", selectedCategory: resolved });

    // Make sure we have a real location first.
    let loc = userLocation;
    if (!loc) {
      // eslint-disable-next-line no-console
      console.log("[tg] requesting geolocation…");
      loc = await requestLocation();
      // eslint-disable-next-line no-console
      console.log("[tg] geolocation result", loc);
    }
    if (!loc) {
      update({ mode: "idle", selectedCategory: null });
      setResolveError("Location permission is needed to find places nearby.");
      toast.error("Location permission is needed to find places.");
      return;
    }

    if (!hasMapboxToken()) {
      update({ mode: "idle", selectedCategory: null });
      setResolveError("Mapbox token missing.");
      toast.error("Mapbox token missing — set REACT_APP_MAPBOX_API_KEY.");
      return;
    }

    try {
      const tryQueue = [resolved];
      let found = null;
      let usedCat = resolved;
      for (const c of tryQueue) {
        // eslint-disable-next-line no-console
        console.log("[tg] searching", c.searchCanonical, "near", loc);
        found = await findNearestPOI({
          category: c.searchCanonical,
          alternatives: c.searchAlternatives,
          searchQuery: c.searchQuery,
          searchQueryCategory: c.searchQueryCategory,
          excludeKeywords: c.excludeKeywords,
          lng: loc.lng,
          lat: loc.lat,
        });
        // eslint-disable-next-line no-console
        console.log("[tg] found", found);
        if (found) {
          usedCat = c;
          break;
        }
      }
      if (!found) {
        update({ mode: "idle", selectedCategory: null });
        setResolveError("No nearby places found in this category.");
        toast.error("No nearby places found. Try another category.");
        return;
      }
      // eslint-disable-next-line no-console
      console.log("[tg] activating session →", found.name);
      haptics.success();

      // Start GPS distance tracker
      const sessionMode = MODE_MAP[travelMode] || "walk";
      tracker.start(sessionMode);
      plannedDistanceRef.current = null;

      update({
        mode: "active",
        userLocation: loc,
        selectedCategory: usedCat,
        destination: {
          ...found,
          categoryKey: usedCat.key,
          viaRandom: false,
        },
        currentTab: "compass",
        navStarted: false,
        sessionStartedAt: Date.now(),
      });
      startWatchingLocation();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[tg] handleSelectCategory error", e);
      update({ mode: "idle", selectedCategory: null });
      setResolveError(e.message || "Failed to resolve destination");
      toast.error("Could not resolve destination.");
    }
  };

  const handleEndSession = async () => {
    // Stop GPS tracker and collect results
    const trackResult = tracker.stop();

    if (destination && userLocation && selectedCategory) {
      const straightLine = haversineMeters(userLocation, destination);
      const plannedKm = plannedDistanceRef.current;

      try {
        await saveSession({
          id: `${Date.now()}`,
          startedAt: trackResult.startedAt || Date.now(),
          endedAt: trackResult.endedAt || Date.now(),
          destinationName: destination.name,
          destinationAddress: destination.address,
          destinationLng: destination.lng,
          destinationLat: destination.lat,
          categoryKey: selectedCategory.key,
          categoryLabel: selectedCategory.label,
          iconKey: selectedCategory.iconKey,
          accent: selectedCategory.accent,
          accentSoft: selectedCategory.accentSoft,

          // ── Distance tracking v2 ──
          mode: trackResult.mode || MODE_MAP[travelMode] || "walk",
          plannedDistanceKm: plannedKm != null ? +(plannedKm / 1000).toFixed(3) : null,
          actualDistanceKm: trackResult.actualDistanceKm || 0,
          durationSec: trackResult.durationSec || 0,
          averageSpeed: trackResult.averageSpeed || 0,

          routePoints: trackResult.routePoints || [],

          // Legacy compat (for old InsightsView consumers)
          distance: straightLine,
          viaRandom: !!destination.viaRandom,

          destination: {
            name: destination.name,
            lat: destination.lat,
            lng: destination.lng,
            address: destination.address,
            category: selectedCategory.key,
          },
        });
      } catch {
        /* ignore */
      }
    }
    resetSession();
  };

  const sessionActive = mode === "active";
  const tab = currentTab;

  return (
    <div className="App">
      <div className="tg-ambient" />

      <AnimatePresence>
        {showSplash && <SplashScreen />}
      </AnimatePresence>

      <AnimatePresence>
        {animatingMode && <ModeOverlayAnimation mode={animatingMode} />}
      </AnimatePresence>

      {/* Tab views — GPU-composited fade, fast and snappy transitions */}
      <AnimatePresence>
        {tab === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ willChange: "opacity" }}
            className="absolute inset-0"
          >
            <HomeScreen onSelectCategory={handleSelectCategory} />
          </motion.div>
        )}

        {tab === "compass" && (
          <motion.div
            key="compass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ willChange: "opacity" }}
            className="absolute inset-0"
          >
            <CompassView onCancel={handleEndSession} />
          </motion.div>
        )}

        {tab === "map" && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ willChange: "opacity" }}
            className="absolute inset-0"
          >
            <MapView
              onEnd={handleEndSession}
              tracker={tracker}
              plannedDistanceRef={plannedDistanceRef}
            />
          </motion.div>
        )}

        {tab === "insights" && (
          <motion.div
            key="insights"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ willChange: "opacity" }}
            className="absolute inset-0 overflow-y-auto tg-scroll"
          >
            <InsightsView />
          </motion.div>
        )}

        {tab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ willChange: "opacity" }}
            className="absolute inset-0"
          >
            <SettingsView />
          </motion.div>
        )}
      </AnimatePresence>


      {/* TabBar is permanent — no AnimatePresence needed, saves a compositor layer */}
      <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none">
        <TabBar
          currentTab={tab}
          onChange={(k) => update({ currentTab: k })}
        />
      </div>

      <AnimatePresence>
        {mode === "resolving" && (
          <ResolvingOverlay category={selectedCategory} />
        )}
      </AnimatePresence>


      <Toaster
        position="top-center"
        theme="dark"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: "rgba(20,20,24,0.85)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
          },
        }}
      />
    </div>
  );
}

function App() {
  const isMobile = useIsMobile();
  // Remove the platform "Made with Emergent" badge — it overlaps our floating
  // tab bar and clashes with the calm aesthetic. Uses a small MutationObserver
  // so the badge stays gone even if injected after mount. Also check the deployed
  // app version on startup to clear old caches/service worker and migrate if needed.
  useEffect(() => {
    checkAppVersion();

    const remove = () => {
      const el = document.getElementById("emergent-badge");
      if (el && el.parentNode) el.parentNode.removeChild(el);
    };
    remove();
    const obs = new MutationObserver(remove);
    obs.observe(document.body, { childList: true, subtree: false });
    return () => obs.disconnect();
  }, []);
  if (!isMobile) {
    return <DesktopInterstitial />;
  }
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

export default App;
