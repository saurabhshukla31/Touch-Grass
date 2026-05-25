#  Touch Grass

A premium, mobile-first Progressive Web App (PWA) designed to reconnect users with the physical world through calm, spatial navigation. Built with a bespoke **iOS-26 Liquid Glass** design language, it uses real-time geolocation, Mapbox routing, and local browser storage to guide you to nearby points of interest and verify when you've actually "touched grass."

---

## ✨ Features

- **📱 Strict Mobile Gate**: Designed exclusively for hand-held viewports (viewports under `820px` or via `?mobile=1` query override). Desktop users are greeted by a beautifully frosted glass interstitial.
- **🧭 Compass Navigation**: An interactive, magnetometer-driven compass rose showing real-time bearing, distance, and ETA.
- **🗺️ Custom Map View**: A dark, custom-styled Mapbox layer displaying your location with animated pulses, destination markers, glowing route lines, and course-up active navigation.
- **🔍 Real-Time POI Resolution**: Resolves real locations nearby for categories like Cafés, Restaurants, Gyms, Pharmacies, ATMs, or a randomized mystery location with an animated reveal.
- **📸 Grass Verification**: Arriving at a destination unlocks an on-device green-pixel analysis using the device's camera. Photos of verified moments are saved directly to your device.
- **📊 Insights & Gallery**: Access a 30-day activity heatmap, total distance stats, session history, and your verified grass photo gallery.
- **⚙️ Settings**: Control metric/imperial units, default travel modes (Walk, Bike, Drive), and toggle tactile haptics feedback.

---

## 🛠️ Tech Stack

- **Core**: React 19, Create React App, Tailwind CSS, Framer Motion
- **Maps & Routing**: Mapbox GL JS (Search Box Category API & Directions API)
- **Local Storage**: IndexedDB (via `idb` wrapper) for session history, photos, and settings
- **Icons**: Lucide React & custom-crafted SVG assets
- **Dev Tooling**: Craco (for Tailwind / PostCSS pipelines)

---

## 🚀 Getting Started

### 📋 Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 🔌 Setup

1. **Clone the repository and enter the directory:**
   ```bash
   cd TG
   ```

2. **Configure your Environment Variables:**
   Create or edit the `.env` file in the `frontend` folder:
   ```env
   REACT_APP_MAPBOX_API_KEY=your_mapbox_public_token_here
   ```

3. **Install dependencies:**
   ```bash
   cd frontend
   # Run npm install with peer-dependency flags if needed:
   npm install
   ```

4. **Start the Development Server:**
   ```bash
   npm run start
   ```
   Open **[http://localhost:3000](http://localhost:3000)** in your browser. (Append `?mobile=1` if viewing on a desktop browser to bypass the interstitial).

---

## 📂 Architecture

```
frontend/
├── public/                  # Static assets, web manifest, and service worker
├── src/
│   ├── components/          # App views (Compass, Map, Insights, Settings, Interstitial)
│   │   └── icons/           # Custom premium SVG icons (GrassLeaf, CompassNeedle)
│   ├── lib/                 # Core state engine, DB wrapper, and Mapbox controllers
│   │   ├── AppState.jsx     # Global context for coordinate streaming, permissions & navigation
│   │   ├── db.js            # IndexedDB stores (sessions, photos, settings)
│   │   ├── geo.js           # Haversine distance computations & formatting
│   │   ├── haptics.js       # navigator.vibrate wrapper for active feedback
│   │   └── mapbox.js        # Category search and directions resolution
│   ├── App.css
│   ├── App.js               # Entry router and mobile gating
│   ├── index.css            # Custom CSS and glassmorphism design tokens
│   └── index.js
```
