// Live GPS session tracker — accumulates actual traveled distance
// during an active navigation session using watchPosition.

import { useCallback, useEffect, useRef, useState } from "react";
import { haversineMeters } from "@/lib/geo";

// ── Constants ──────────────────────────────────────────────────
const MIN_MOVE_METERS = 5;       // ignore jitter < 5m
const MAX_ACCURACY     = 30;      // ignore readings with accuracy > 30m
const THROTTLE_MS      = 3000;    // min interval between accepted points



// ── Tracker class (imperative, not tied to React lifecycle) ───
export class SessionTracker {
  constructor() {
    this.reset();
    this._watchId = null;
    this._lastAcceptedTs = 0;
    this._onChange = null; // callback
  }

  reset() {
    this.routePoints = [];
    this.actualDistanceKm = 0;
    this.startedAt = null;
    this.endedAt = null;
    this.prevPoint = null;
    this._lastAcceptedTs = 0;
  }

  /** Begin tracking. */
  start(mode = "walk") {
    this.reset();
    this.mode = mode;
    this.startedAt = Date.now();

    if (!("geolocation" in navigator)) return;

    this._watchId = navigator.geolocation.watchPosition(
      (pos) => this._onPosition(pos),
      () => {}, // silently ignore errors
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      },
    );
  }

  /** Stop tracking and return final snapshot. */
  stop() {
    if (this._watchId != null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
    this.endedAt = Date.now();

    const durationSec = this.startedAt
      ? Math.round((this.endedAt - this.startedAt) / 1000)
      : 0;

    const avgSpeed =
      durationSec > 0
        ? +((this.actualDistanceKm / (durationSec / 3600)).toFixed(1))
        : 0;



    return {
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      mode: this.mode,
      actualDistanceKm: +this.actualDistanceKm.toFixed(3),
      durationSec,
      averageSpeed: avgSpeed,

      routePoints: this.routePoints,
    };
  }

  /** Internal — called by watchPosition. */
  _onPosition(pos) {
    const { latitude, longitude, accuracy } = pos.coords;
    const now = pos.timestamp || Date.now();

    // ── Filter bad readings ──
    if (accuracy > MAX_ACCURACY) return;

    // ── Throttle updates ──
    if (now - this._lastAcceptedTs < THROTTLE_MS) return;

    const current = { lat: latitude, lng: longitude };

    // ── Jitter filter ──
    if (this.prevPoint) {
      const dist = haversineMeters(this.prevPoint, current);
      if (dist < MIN_MOVE_METERS) return;

      // Accept — accumulate distance
      this.actualDistanceKm += dist / 1000;
    }

    // ── Store point ──
    this.routePoints.push({ lat: latitude, lng: longitude, timestamp: now });
    this.prevPoint = current;
    this._lastAcceptedTs = now;

    // Notify listener
    this._onChange?.({
      actualDistanceKm: +this.actualDistanceKm.toFixed(3),
      routePoints: this.routePoints,
      durationSec: this.startedAt
        ? Math.round((now - this.startedAt) / 1000)
        : 0,
    });
  }
}

// ── React hook ─────────────────────────────────────────────────

const trackerInstance = new SessionTracker();

/**
 * Hook that exposes the session tracker's live state.
 *
 * Usage:
 * ```
 * const { isTracking, actualDistanceKm, routePoints, durationSec, start, stop } = useSessionTracker();
 * ```
 */
export function useSessionTracker() {
  const [state, setState] = useState({
    actualDistanceKm: 0,
    routePoints: [],
    durationSec: 0,
    isTracking: false,
  });

  const intervalRef = useRef(null);

  // Wire up the tracker's onChange callback
  useEffect(() => {
    trackerInstance._onChange = (snap) => {
      setState((s) => ({ ...s, ...snap, isTracking: true }));
    };
    return () => {
      trackerInstance._onChange = null;
    };
  }, []);

  const start = useCallback((mode) => {
    trackerInstance.start(mode);
    setState({
      actualDistanceKm: 0,
      routePoints: [],
      durationSec: 0,
      isTracking: true,
    });

    // Tick duration every second for live UI
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (trackerInstance.startedAt) {
        setState((s) => ({
          ...s,
          durationSec: Math.round((Date.now() - trackerInstance.startedAt) / 1000),
        }));
      }
    }, 1000);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const result = trackerInstance.stop();
    setState((s) => ({ ...s, isTracking: false }));
    return result;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { ...state, start, stop };
}
