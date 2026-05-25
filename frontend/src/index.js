import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import "mapbox-gl/dist/mapbox-gl.css"; // ✅ Mapbox CSS imported globally here
import App from "@/App";
import { unregister as unregisterSW } from "@/serviceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

unregisterSW();
