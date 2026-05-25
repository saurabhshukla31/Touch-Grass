import React, { useEffect, useState } from "react";
import "@/App.css";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import { AppProvider, useApp } from "@/lib/AppState";
import { CATEGORIES, RANDOM_POOL, getCategoryByKey } from "@/lib/categories";
import { findNearestPOI, hasMapboxToken } from "@/lib/mapbox";
import { saveSession } from "@/lib/db";
import { haversineMeters } from "@/lib/geo";
import { haptics } from "@/lib/haptics";

import DesktopInterstitial from "@/components/DesktopInterstitial";
import HomeScreen from "@/components/HomeScreen";
import TabBar from "@/components/TabBar";
import CompassView from "@/components/CompassView";
import MapView from "@/components/MapView";
import InsightsView from "@/components/InsightsView";
import SettingsView from "@/components/SettingsView";
import RandomReveal from "@/components/RandomReveal";
import GrassVerification from "@/components/GrassVerification";

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
  return (
    <motion.div
      data-testid="resolving-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[55] flex flex-col items-center justify-center px-8 text-center"
      style={{
        background: "rgba(8,8,10,0.6)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div className="relative">
        <div
          className="h-16 w-16 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, rgba(16,185,129,0.7), transparent 75%)",
            filter: "blur(8px)",
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-emerald-400/60"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            borderTopColor: "transparent",
            borderRightColor: "transparent",
          }}
        />
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
  } = useApp();

  const [resolveError, setResolveError] = useState(null);
  const [randomCategory, setRandomCategory] = useState(null);
  const [showVerification, setShowVerification] = useState(false);

  // Auto-watch geolocation once we're active.
  useEffect(() => {
    if (mode === "active") startWatchingLocation();
  }, [mode, startWatchingLocation]);

  const handleSelectCategory = async (cat) => {
    haptics.select();
    setResolveError(null);
    let resolved = cat;
    if (cat.key === "random") {
      const pool = RANDOM_POOL;
      resolved = pool[Math.floor(Math.random() * pool.length)];
      setRandomCategory(resolved);
      // brief reveal delay
      await new Promise((r) => setTimeout(r, 1100));
    }
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
      setRandomCategory(null);
      update({ mode: "idle", selectedCategory: null });
      setResolveError("Location permission is needed to find places nearby.");
      toast.error("Location permission is needed to find places.");
      return;
    }

    if (!hasMapboxToken()) {
      setRandomCategory(null);
      update({ mode: "idle", selectedCategory: null });
      setResolveError("Mapbox token missing.");
      toast.error("Mapbox token missing — set REACT_APP_MAPBOX_API_KEY.");
      return;
    }

    try {
      // For Random, try the picked one; if no results, try a couple more.
      const tryQueue =
        cat.key === "random"
          ? [resolved, ...pickAlternates(resolved)]
          : [resolved];
      let found = null;
      let usedCat = resolved;
      for (const c of tryQueue) {
        // eslint-disable-next-line no-console
        console.log("[tg] searching", c.searchCanonical, "near", loc);
        found = await findNearestPOI({
          category: c.searchCanonical,
          alternatives: c.searchAlternatives,
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
        setRandomCategory(null);
        update({ mode: "idle", selectedCategory: null });
        setResolveError("No nearby places found in this category.");
        toast.error("No nearby places found. Try another category.");
        return;
      }
      setRandomCategory(null);
      // eslint-disable-next-line no-console
      console.log("[tg] activating session →", found.name);
      haptics.success();
      update({
        mode: "active",
        selectedCategory: usedCat,
        destination: {
          ...found,
          categoryKey: usedCat.key,
          viaRandom: cat.key === "random",
        },
        currentTab: "compass",
        navStarted: false,
      });
      startWatchingLocation();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[tg] handleSelectCategory error", e);
      setRandomCategory(null);
      update({ mode: "idle", selectedCategory: null });
      setResolveError(e.message || "Failed to resolve destination");
      toast.error("Could not resolve destination.");
    }
  };

  function pickAlternates(c) {
    return RANDOM_POOL.filter((x) => x.key !== c.key)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  }

  const handleEndSession = async () => {
    if (destination && userLocation && selectedCategory) {
      const dist = haversineMeters(userLocation, destination);
      try {
        await saveSession({
          id: `${Date.now()}`,
          startedAt: Date.now(),
          destinationName: destination.name,
          destinationAddress: destination.address,
          destinationLng: destination.lng,
          destinationLat: destination.lat,
          categoryKey: selectedCategory.key,
          categoryLabel: selectedCategory.label,
          iconKey: selectedCategory.iconKey,
          accent: selectedCategory.accent,
          accentSoft: selectedCategory.accentSoft,
          distance: dist,
          viaRandom: !!destination.viaRandom,
        });
      } catch {
        /* ignore */
      }
    }
    // Grass arrival → offer verification before exiting.
    if (selectedCategory?.key === "grass") {
      setShowVerification(true);
      return;
    }
    resetSession();
    toast.success("Session saved.");
  };

  const sessionActive = mode === "active";
  const tab = currentTab;

  return (
    <div className="App">
      <div className="tg-ambient" />

      <AnimatePresence mode="wait">
        {/* Show home only when idle AND active tab is compass/map (the "home" slot) */}
        {!sessionActive && (tab === "compass" || tab === "map") && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <HomeScreen onSelectCategory={handleSelectCategory} />
          </motion.div>
        )}

        {sessionActive && tab === "compass" && (
          <motion.div
            key="compass"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CompassView onCancel={handleEndSession} />
          </motion.div>
        )}

        {sessionActive && tab === "map" && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <MapView onEnd={handleEndSession} />
          </motion.div>
        )}

        {tab === "insights" && (
          <motion.div
            key="insights"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
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
            transition={{ duration: 0.2 }}
          >
            <SettingsView />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Only render TabBar if a session is actively running or if we are not on the start screen (home mapping view) */}
        {sessionActive && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed inset-x-0 bottom-0 z-50 pointer-events-none"
          >
            <TabBar
              currentTab={tab}
              onChange={(k) => update({ currentTab: k })}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {randomCategory && <RandomReveal category={randomCategory} />}
        {mode === "resolving" && !randomCategory && (
          <ResolvingOverlay category={selectedCategory} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVerification && (
          <GrassVerification
            session={{
              id: destination?.mapboxId,
              destinationName: destination?.name,
            }}
            onComplete={() => {
              setShowVerification(false);
              resetSession();
              toast.success("Session saved.");
            }}
            onSkip={() => {
              setShowVerification(false);
              resetSession();
              toast.success("Session saved.");
            }}
          />
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
  // so the badge stays gone even if injected after mount.
  useEffect(() => {
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
