// Service worker registration — silent failures, no UI disruption.
export function register() {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Only in production-like envs to avoid breaking CRA dev HMR.
    const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
    if (isLocalhost) return;
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .catch(() => {
                /* swallow */
            });
    });
}
