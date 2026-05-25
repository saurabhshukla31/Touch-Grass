import { openDB } from "idb";

const DB_NAME = "touch-grass";
const DB_VERSION = 1;

let dbPromise = null;
const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains("sessions")) {
                    const store = db.createObjectStore("sessions", {
                        keyPath: "id",
                    });
                    store.createIndex("startedAt", "startedAt");
                    store.createIndex("category", "category");
                }
                if (!db.objectStoreNames.contains("settings")) {
                    db.createObjectStore("settings");
                }
                if (!db.objectStoreNames.contains("photos")) {
                    db.createObjectStore("photos", { keyPath: "id" });
                }
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

export async function savePhoto(photo) {
    const db = await getDB();
    await db.put("photos", photo);
}

export async function listPhotos() {
    const db = await getDB();
    const all = await db.getAll("photos");
    return all.sort((a, b) => b.takenAt - a.takenAt);
}

const SETTINGS_KEY = "user-settings";
const DEFAULT_SETTINGS = {
    units: "metric",
    defaultTravelMode: "walking",
    hapticsEnabled: true,
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
