const fs = require("fs");
const path = require("path");

// Paths to files that require version synchronization
const pkgPath = path.join(__dirname, "../package.json");
const publicVersionPath = path.join(__dirname, "../public/version.json");
const srcVersionPath = path.join(__dirname, "../src/lib/version.js");

// 1. Read the current version from package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const currentVersion = pkg.version;

// 2. Parse arguments (e.g., npm run bump-version [patch | minor | major | <custom_version>])
const bumpType = process.argv[2] || "patch";
let newVersion = currentVersion;

if (["patch", "minor", "major"].includes(bumpType)) {
    const parts = currentVersion.split(".").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
        if (bumpType === "major") {
            parts[0] += 1;
            parts[1] = 0;
            parts[2] = 0;
        } else if (bumpType === "minor") {
            parts[1] += 1;
            parts[2] = 0;
        } else if (bumpType === "patch") {
            parts[2] += 1;
        }
        newVersion = parts.join(".");
    } else {
        console.error(`[Error] Invalid package.json version: "${currentVersion}".`);
        process.exit(1);
    }
} else {
    // Check if it's a valid semantic version string (e.g. 1.0.0)
    if (/^\d+\.\d+\.\d+$/.test(bumpType)) {
        newVersion = bumpType;
    } else {
        console.error(`[Error] Invalid argument: "${bumpType}". Use "patch", "minor", "major", or a version string like "1.0.0".`);
        process.exit(1);
    }
}

console.log(`[Version] Bumping version: ${currentVersion} -> ${newVersion}`);

// 3. Write updated version back to package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

// 4. Write to public/version.json (for deployed server comparison)
const versionJson = { version: newVersion };
fs.writeFileSync(publicVersionPath, JSON.stringify(versionJson, null, 2) + "\n", "utf8");

// 5. Write to src/lib/version.js (for client state references)
fs.writeFileSync(srcVersionPath, `export const APP_VERSION = "${newVersion}";\n`, "utf8");

console.log("[Version] Successfully synchronized all version references!");
