import React from "react";

// A beautiful, premium cluster of fanned grass blades with custom gradients.
// Designed to look extremely modern and fit the dark glassmorphic aesthetic.
export const GrassLeaf = ({ size = 28, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
        aria-hidden="true"
    >
        <defs>
            <linearGradient id="grass-grad-left" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#064e3b" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="grass-grad-mid" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#065f46" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>
            <linearGradient id="grass-grad-right" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#064e3b" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
        </defs>
        {/* Left Blade */}
        <path
            d="M10.5 22C9.2 16.5 6.2 12.8 3.5 9.5C6.5 11.5 9.2 15.5 11.2 22H10.5Z"
            fill="url(#grass-grad-left)"
        />
        {/* Middle Blade */}
        <path
            d="M11.2 22C11.5 15.0 12.8 9.5 16.2 4.0C13.8 8.5 12.5 14.5 11.8 22H11.2Z"
            fill="url(#grass-grad-mid)"
        />
        {/* Right Blade */}
        <path
            d="M11.8 22C13.0 17.5 15.8 14.5 19.5 11.8C16.8 13.5 14.0 17.0 12.5 22H11.8Z"
            fill="url(#grass-grad-right)"
        />
    </svg>
);

export default GrassLeaf;
