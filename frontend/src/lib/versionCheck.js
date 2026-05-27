import { unregister as unregisterServiceWorker } from "../serviceWorkerRegistration";
import { APP_VERSION } from "./version";
import { migrateDB } from "./db";

export async function checkAppVersion() {
    try {
        // Fetch the deployed version.json from the server with cache-busting timestamp
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        const deployedVersion = data.version;

        if (!deployedVersion) return;

        // Get the last known version from localStorage
        const storedVersion = localStorage.getItem("app-version");

        // If it's the first time running (no stored version), initialize it
        if (!storedVersion) {
            localStorage.setItem("app-version", deployedVersion);
            // If the running bundle is outdated compared to the server deployment, reload immediately
            if (deployedVersion !== APP_VERSION) {
                console.log(`[VersionCheck] Outdated running code on first run: ${APP_VERSION} -> ${deployedVersion}. Reloading...`);
                await migrateDB(APP_VERSION, deployedVersion);
                await unregisterServiceWorker();
                if (window.caches) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((key) => caches.delete(key)));
                }
                window.location.reload(true);
            }
            return;
        }

        // If a new version is detected
        if (deployedVersion !== storedVersion) {
            console.log(`[VersionCheck] App update found: ${storedVersion} -> ${deployedVersion}. Migrating & reloading...`);

            // 1. Run database data migrations if needed
            await migrateDB(storedVersion, deployedVersion);

            // 2. Unregister all service workers
            await unregisterServiceWorker();

            // 3. Clear all browser caches
            if (window.caches) {
                const keys = await caches.keys();
                await Promise.all(keys.map((key) => caches.delete(key)));
            }

            // 4. Update the stored version in localStorage
            localStorage.setItem("app-version", deployedVersion);

            // 5. Force a full page reload from server (bypassing browser cache)
            window.location.reload(true);
        }
    } catch (err) {
        console.error("[VersionCheck] Failed to check app version:", err);
    }
}
