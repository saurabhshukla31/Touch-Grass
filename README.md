# RoamOut

A premium, mobile-first Progressive Web App (PWA) designed to reconnect users with the physical world. Follow along with real-time compass and map guides to step outside, explore nearby points of interest, and verify your presence in nature through on-device camera analysis.

## Features

- **Compass navigation** — magnetometer-driven compass rose showing live bearing, distance, and ETA
- **Custom Map view** — dark Mapbox GL JS layer showing your location, destination, course-up navigation, and traveled path
- **Real-time POI resolution** — automatic lookup of nearest cafés, parks, gyms, essentials, or randomized mystery locations using Mapbox Search Box API
- **Grass verification** — on-device green-pixel analysis using your phone's camera to verify when you've reached nature, saving moments to a local gallery
- **Insights & stats** — 30-day activity heatmap, session streak tracker, total distance, and transportation mode breakdowns
- **Dynamic travel profiles** — customizable routing presets for walking, cycling, or driving
- **iOS-26 Liquid Glass UI** — glassmorphism design featuring smooth GPU-composited transitions, haptic feedback, and a fluid dark/light theme switch

## Tech Stack

| Layer | Tech |
|-------|------|
| Core | React 19 |
| Styling | Tailwind CSS 3 (via PostCSS / Craco) |
| Maps & Routing | Mapbox GL JS (Search Box & Directions APIs) |
| Local Database | IndexedDB (via `idb` wrapper) |
| Animations | Framer Motion |
| Build Tool | CRA + Craco |

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd "RoamOut"

# Configure Environment
# Create a .env file in the frontend/ folder with:
# REACT_APP_MAPBOX_API_KEY=your_mapbox_token

# Install dependencies
cd frontend
npm install

# Start the dev server
# Note: For Windows PowerShell, run: $env:PORT=3000; npm.cmd start
npm start
```

## Project Structure

```
frontend/
├── public/
│   ├── sw.js                 # Offline service worker logic & asset cache
│   └── manifest.json         # PWA configuration
├── src/
│   ├── components/
│   │   ├── icons/
│   │   │   └── CompassNeedle.jsx     # Custom SVG compass needle component
│   │   ├── CompassView.jsx           # Main compass page & magnetometer interface
│   │   ├── DesktopInterstitial.jsx   # Frosted glass gate for desktop users
│   │   ├── DestinationPill.jsx       # Floating session detail toggle
│   │   ├── GrassVerification.jsx     # Camera viewport & pixel analyzer
│   │   ├── HomeScreen.jsx            # Category grid page (Explore, Date, Essentials, etc.)
│   │   ├── InsightsView.jsx          # User statistics page, weekly chart, and gallery
│   │   ├── MapView.jsx               # Mapbox GL routing rendering & controls
│   │   ├── SettingsView.jsx          # Units, travel modes, themes, and storage setup
│   │   └── TabBar.jsx                # Bottom navigation bar with spring animations
│   ├── lib/
│   │   ├── AppState.jsx              # Global state context (GPS stream, config settings)
│   │   ├── categories.js             # POI configuration modes and categories
│   │   ├── db.js                     # IndexedDB wrapper (sessions, photos, settings)
│   │   ├── geo.js                    # Geolocation math, speed parsing, and streak calculators
│   │   ├── haptics.js                # Tactile haptic feedback trigger helper
│   │   ├── mapbox.js                 # Mapbox Search API and Directions queries
│   │   ├── sessionTracker.js         # Navigation distance tracker using GPS stream
│   │   ├── version.js                # Constant current client build version
│   │   └── versionCheck.js           # Client-to-server build sync & cache clearing
│   ├── App.js                        # View router & mobile viewport guard
│   ├── index.css                     # Design tokens & Liquid Glass css styling
│   └── index.js                      # React application render entry point
├── scripts/
│   └── bump-version.js        # Node automation script to increment app version
```

## Codebase Audit

A professional quality, production-grade audit of the codebase has been completed.
You can review the detailed architectural findings, memory leak notes, and stability risks in the **[Codebase Audit Report](file:///C:/Users/saura/.gemini/antigravity-ide/brain/60caefaa-1cbc-4c43-a168-6951109ee049/codebase_audit.md)**.

## License

The MIT License (MIT)

Copyright (c) 2026 Saurabh Shukla 

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
