import React from "react";

// A beautiful, premium cluster of fanned grass blades with custom gradients.
// Designed to look extremely modern and fit the dark glassmorphic aesthetic.
export const GrassLeaf = ({ size = 28, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
    >
        <line x1="8" y1="40" x2="40" y2="40" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
        <path d="M18 40 C16 32 10 28 12 18 C14 24 18 28 20 34" fill="#16a34a" opacity="0.7"/>
        <path d="M30 40 C32 32 38 28 36 18 C34 24 30 28 28 34" fill="#16a34a" opacity="0.7"/>
        <path d="M24 40 C24 30 14 22 16 10 C20 18 24 22 24 22 C24 22 28 18 32 10 C34 22 24 30 24 40Z" fill="#22c55e"/>
        <path d="M24 22 C24 22 21 17 22 12 C23 16 24 22 24 22Z" fill="#4ade80" opacity="0.6"/>
        <circle cx="30" cy="22" r="2" fill="#86efac" opacity="0.8"/>
        <circle cx="31" cy="21" r="0.7" fill="white" opacity="0.6"/>
    </svg>
);

export default GrassLeaf;
