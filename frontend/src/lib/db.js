import { openDB } from "idb";

const DB_NAME = "touch-grass";
const DB_VERSION = 2;

let dbPromise = null;
const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                // ── v1 stores ──
                if (oldVersion < 1) {
                    const store = db.createObjectStore("sessions", {
                        keyPath: "id",
                    });
                    store.createIndex("startedAt", "startedAt");
                    store.createIndex("category", "category");

                    db.createObjectStore("settings");
                    db.createObjectStore("photos", { keyPath: "id" });
                }

                // ── v2: new fields on sessions ──
                // No new indexes needed — actualDistanceKm, mode, etc. are
                // simple properties. Existing v1 session docs remain readable;
                // they'll just lack the new fields until the next session save.
            },
        });
    }
    return dbPromise;
};



export async function saveSession(session) {
    const db = await getDB();
    await db.put("sessions", session);
    return session;
}

export async function listSessions() {
    const db = await getDB();
    const all = await db.getAll("sessions");
    return all.sort((a, b) => b.startedAt - a.startedAt);
}

export async function deleteSession(id) {
    const db = await getDB();
    await db.delete("sessions", id);
}

// Wipe every session, photo and persisted setting. Returns nothing.
export async function clearAllData() {
    const db = await getDB();
    await Promise.all([
        db.clear("sessions"),
        db.clear("photos"),
        db.clear("settings"),
    ]);
}


const SETTINGS_KEY = "user-settings";
const DEFAULT_SETTINGS = {
    units: "metric",
    defaultTravelMode: "walking",
    hapticsEnabled: true,
    mapViewMode: "2d",
    navViewMode: "3d",
    appMode: "explore",
};

export async function getSettings() {
    const db = await getDB();
    const s = await db.get("settings", SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export async function setSettings(next) {
    const db = await getDB();
    const merged = { ...(await getSettings()), ...next };
    await db.put("settings", merged, SETTINGS_KEY);
    return merged;
}

export async function migrateDB(oldAppVersion, newAppVersion) {
    console.log(`Running IndexedDB data migrations from ${oldAppVersion} to ${newAppVersion}...`);
    // Custom database migrations can be added here if app versions change.
}
